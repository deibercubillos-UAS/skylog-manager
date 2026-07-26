/**
 * GET  /api/public/mor/[orgCode]  → formulario MOR (definición + campos)
 * POST /api/public/mor/[orgCode]  → enviar reporte MOR (sin autenticación)
 *
 * MOR = Mandatory Occurrence Report (RAC 100 / Aerocivil)
 * Misma lógica que VOR, type='MOR'.
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { resolveOrg, supabaseAdmin } from '../../_resolveOrg';
import { escHtml } from '@/lib/emailHelpers';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { PERMISSIONS } from '@/lib/roles';
import { logCaseEvent } from '@/lib/smsCase';

export async function GET(request, { params }) {
    try {
        const { orgCode } = await params;
        const org = await resolveOrg(orgCode);
        if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

        const { data: def, error } = await supabaseAdmin
            .from('vor_mor_definitions')
            .select('id, title, description, custom_fields')
            .eq('organization_id', org.id)
            .eq('type', 'MOR')
            .eq('is_active', true)
            .maybeSingle();

        if (error) throw error;

        const { data: barriers } = await supabaseAdmin
            .from('safety_barriers')
            .select('id, name')
            .eq('organization_id', org.id)
            .eq('status', 'Activa')
            .order('name');

        return NextResponse.json({
            org_name: org.company_name,
            form: def || null,
            barriers: barriers || [],
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    try {
        // Rate limiting: máx 5 reportes MOR por IP por minuto
        const ip = getClientIp(request);
        const { allowed } = checkRateLimit(`mor:${ip}`, { limit: 5, windowMs: 60_000 });
        if (!allowed) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
        }

        const { orgCode } = await params;
        const org = await resolveOrg(orgCode);
        if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

        // Ver nota equivalente en el POST de /api/public/vor/[orgCode]: si la
        // org nunca visitó el editor de formato, se crea la definición por
        // defecto de forma perezosa en vez de bloquear el envío.
        let { data: def } = await supabaseAdmin
            .from('vor_mor_definitions')
            .select('id')
            .eq('organization_id', org.id)
            .eq('type', 'MOR')
            .eq('is_active', true)
            .maybeSingle();

        if (!def) {
            const { data: created, error: createErr } = await supabaseAdmin
                .from('vor_mor_definitions')
                .insert([{
                    organization_id: org.id,
                    type: 'MOR',
                    title: 'Reporte Obligatorio de Ocurrencia (MOR)',
                    is_active: true,
                }])
                .select('id')
                .single();
            if (createErr) throw createErr;
            def = created;
        }

        const body = await request.json();
        const {
            reporter_name,
            reporter_email,
            occurrence_date,
            occurrence_time,
            location,
            description,
            immediate_actions,
            contributing_factors,
            reported_severity,
            related_barrier_id,
            attachments,
            custom_responses,
        } = body;

        if (!description?.trim()) {
            return NextResponse.json({ error: 'La descripción del evento es obligatoria' }, { status: 400 });
        }

        const VALID_REPORTED_SEVERITIES = ['incidente', 'incidente_grave', 'accidente'];
        const safeReportedSeverity = VALID_REPORTED_SEVERITIES.includes(reported_severity) ? reported_severity : null;

        let safeBarrierId = null;
        if (related_barrier_id) {
            const { data: barrier } = await supabaseAdmin
                .from('safety_barriers')
                .select('id')
                .eq('id', related_barrier_id)
                .eq('organization_id', org.id)
                .maybeSingle();
            if (barrier) safeBarrierId = barrier.id;
        }

        // IP para auditoría básica (reutilizar la ya extraída para rate limiting)
        const submitterIp = ip;

        const { data: submission, error: insertErr } = await supabaseAdmin
            .from('vor_mor_submissions')
            .insert([{
                organization_id: org.id,
                definition_id: def.id,
                type: 'MOR',
                reporter_name: reporter_name?.trim() || null,
                reporter_email: reporter_email?.trim() || null,
                occurrence_date: occurrence_date || null,
                occurrence_time: occurrence_time || null,
                location: location?.trim() || null,
                description: description.trim(),
                immediate_actions: immediate_actions?.trim() || null,
                contributing_factors: contributing_factors?.trim() || null,
                reported_severity: safeReportedSeverity,
                related_barrier_id: safeBarrierId,
                attachments: attachments || [],
                custom_responses: custom_responses || {},
                ip_address: submitterIp,
            }])
            .select('id, is_anonymous')
            .single();

        if (insertErr) throw insertErr;

        await logCaseEvent({
            orgId: org.id,
            vorMorId: submission.id,
            label: 'Reporte MOR recibido',
            actorName: submission.is_anonymous ? null : (reporter_name?.trim() || null),
        });

        await notifySms({ org, submission, type: 'MOR', reporter_name, reporter_email, description });

        return NextResponse.json({
            success: true,
            submission_id: submission.id,
            is_anonymous: submission.is_anonymous,
            message: submission.is_anonymous
                ? 'Reporte MOR enviado de forma anónima.'
                : 'Reporte MOR enviado exitosamente. Recibirás actualizaciones por correo.',
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

async function notifySms({ org, submission, type, reporter_name, reporter_email, description }) {
    try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return;

        // Miembros con rol SMS de la org — vía organization_members (rol) +
        // profiles.active_organization_id (mismo criterio que antes: solo
        // cuentan los que tienen esta org como activa ahora mismo).
        const { data: memberRows } = await supabaseAdmin
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', org.id)
            .in('role', PERMISSIONS.canManageSMS);
        const candidateIds = (memberRows || []).map(m => m.user_id);

        let recipients = [];
        if (candidateIds.length) {
            const { data: profs } = await supabaseAdmin
                .from('profiles')
                .select('email, first_name')
                .eq('active_organization_id', org.id)
                .in('id', candidateIds);
            recipients = profs || [];
        }

        if (!recipients?.length) return;

        const resend = new Resend(resendKey);
        const isAnonymous = !reporter_name;
        const reporterLabel = isAnonymous ? 'Anónimo' : escHtml(reporter_name);
        const safeDescription = escHtml(description?.substring(0, 200)) + (description?.length > 200 ? '…' : '');
        const dashUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com'}/dashboard/safety`;

        for (const recipient of recipients) {
            await resend.emails.send({
                from: 'BitaFly <no-reply@bitafly.com>',
                to: recipient.email,
                subject: `[MOR] ⚠️ Nuevo reporte obligatorio — ${escHtml(org.company_name)}`,
                html: `
                    <p>Hola ${escHtml(recipient.first_name)},</p>
                    <p>Se ha recibido un nuevo <strong>Reporte Obligatorio de Ocurrencia (MOR)</strong> en ${escHtml(org.company_name)}. Este reporte requiere atención según la regulación RAC 100.</p>
                    <table style="border-collapse:collapse;width:100%;max-width:500px">
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Reportante</td><td style="padding:6px 0;font-weight:bold">${reporterLabel}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Descripción</td><td style="padding:6px 0">${safeDescription}</td></tr>
                    </table>
                    ${isAnonymous && reporter_email ? '<p style="color:#64748b;font-size:12px;font-style:italic">El reportante proporcionó email pero prefirió mantenerse anónimo.</p>' : ''}
                    <p><a href="${dashUrl}" style="background:#dc2626;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:8px">Ver reporte urgente en BitaFly</a></p>
                `,
            });
        }
    } catch (_) {
        // Email no crítico
    }
}
