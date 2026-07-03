/**
 * GET  /api/public/vor/[orgCode]  → formulario VOR (definición + campos) para renderizar
 * POST /api/public/vor/[orgCode]  → enviar reporte VOR (sin autenticación)
 */
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { resolveOrg, supabaseAdmin } from '../../_resolveOrg';
import { escHtml } from '@/lib/emailHelpers';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { PERMISSIONS } from '@/lib/roles';
import { logCaseEvent } from '@/lib/smsCase';

// ─────────────────────────────────────────────────────────────────────────────
//  GET: definición del formulario VOR para la org
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
    try {
        const { orgCode } = await params;
        const org = await resolveOrg(orgCode);
        if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

        const { data: def, error } = await supabaseAdmin
            .from('vor_mor_definitions')
            .select('id, title, description, custom_fields')
            .eq('organization_id', org.id)
            .eq('type', 'VOR')
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
            form: def || null,   // null → org no ha configurado VOR aún
            barriers: barriers || [],
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  POST: enviar reporte VOR
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request, { params }) {
    try {
        // Rate limiting: máx 5 reportes VOR por IP por minuto
        const ip = getClientIp(request);
        const { allowed } = checkRateLimit(`vor:${ip}`, { limit: 5, windowMs: 60_000 });
        if (!allowed) {
            return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
        }

        const { orgCode } = await params;
        const org = await resolveOrg(orgCode);
        if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

        // Obtener definición activa
        const { data: def } = await supabaseAdmin
            .from('vor_mor_definitions')
            .select('id')
            .eq('organization_id', org.id)
            .eq('type', 'VOR')
            .eq('is_active', true)
            .maybeSingle();

        if (!def) return NextResponse.json({ error: 'Formulario VOR no disponible para esta organización' }, { status: 404 });

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
                type: 'VOR',
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
            label: 'Reporte VOR recibido',
            actorName: submission.is_anonymous ? null : (reporter_name?.trim() || null),
        });

        // Notificar por email al equipo SMS de la org
        await notifySms({ org, submission, type: 'VOR', reporter_name, reporter_email, description });

        return NextResponse.json({
            success: true,
            submission_id: submission.id,
            is_anonymous: submission.is_anonymous,
            message: submission.is_anonymous
                ? 'Reporte enviado de forma anónima. Gracias por contribuir a la seguridad operacional.'
                : 'Reporte enviado exitosamente. Recibirás actualizaciones por correo.',
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Notificación email al gerente_sms de la org
// ─────────────────────────────────────────────────────────────────────────────
async function notifySms({ org, submission, type, reporter_name, reporter_email, description }) {
    try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return;

        // Buscar gerentes SMS y admins de la org
        const { data: recipients } = await supabaseAdmin
            .from('profiles')
            .select('email, first_name')
            .eq('organization_id', org.id)
            .in('role', PERMISSIONS.canManageSMS);

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
                subject: `[${type}] Nuevo reporte de ocurrencia — ${escHtml(org.company_name)}`,
                html: `
                    <p>Hola ${escHtml(recipient.first_name)},</p>
                    <p>Se ha recibido un nuevo <strong>Reporte ${type === 'VOR' ? 'Voluntario' : 'Obligatorio'} de Ocurrencia</strong> en ${escHtml(org.company_name)}.</p>
                    <table style="border-collapse:collapse;width:100%;max-width:500px">
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Reportante</td><td style="padding:6px 0;font-weight:bold">${reporterLabel}</td></tr>
                        <tr><td style="padding:6px 0;color:#64748b;font-size:13px">Descripción</td><td style="padding:6px 0">${safeDescription}</td></tr>
                    </table>
                    ${isAnonymous && reporter_email ? '<p style="color:#64748b;font-size:12px;font-style:italic">El reportante proporcionó email pero prefirió mantenerse anónimo. Puedes enviarle actualizaciones desde la plataforma sin ver su identidad.</p>' : ''}
                    <p><a href="${dashUrl}" style="background:#0f172a;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:8px">Ver reporte en BitaFly</a></p>
                `,
            });
        }
    } catch (_) {
        // Email no crítico — no fallar el endpoint si Resend falla
    }
}
