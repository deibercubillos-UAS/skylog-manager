/**
 * GET   /api/vor-mor/[id]  → detalle de un reporte
 * PATCH /api/vor-mor/[id]  → actualizar estado, notas, asignado, enviar notif al reportante
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';
import { PERMISSIONS } from '@/lib/roles';

const getAdminClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
//  GET: detalle del reporte
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const ctx = await getOrgContext(supabase);
        if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const supabaseAdmin = getAdminClient();
        const { data, error } = await supabaseAdmin
            .from('vor_mor_submissions')
            .select('*')
            .eq('id', id)
            .eq('organization_id', ctx.orgId)
            .single();

        if (error || !data) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });

        // reporter_email: visible solo si NO es anónimo, O si es superadmin
        const canSeeEmail = !data.is_anonymous || ctx.role === 'superadmin';
        const result = { ...data };
        if (!canSeeEmail) delete result.reporter_email;

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PATCH: actualizar estado / notas / asignado + opcionalmente notificar reportante
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const supabase = await createClientSSR();
        const ctx = await getOrgContext(supabase);
        if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!PERMISSIONS.canManageSMS.includes(ctx.role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const supabaseAdmin = getAdminClient();
        // Verificar que el reporte pertenece a la org
        const { data: existing } = await supabaseAdmin
            .from('vor_mor_submissions')
            .select('id, organization_id, is_anonymous, reporter_email, reporter_name, type, status')
            .eq('id', id)
            .eq('organization_id', ctx.orgId)
            .single();

        if (!existing) return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });

        const body = await request.json();
        const {
            status,
            assigned_to,
            internal_notes,
            investigation_summary,
            notify_reporter,        // boolean: enviar email al reportante
            notification_message,   // texto para el email al reportante
        } = body;

        // Campos actualizables
        const updates = {};
        const VALID_STATUSES = ['recibido', 'en_investigacion', 'cerrado', 'archivado'];
        if (status && VALID_STATUSES.includes(status)) updates.status = status;
        if (assigned_to !== undefined) updates.assigned_to = assigned_to || null;
        if (internal_notes !== undefined) updates.internal_notes = internal_notes;
        if (investigation_summary !== undefined) updates.investigation_summary = investigation_summary;

        if (Object.keys(updates).length > 0) {
            const { error: updateErr } = await supabaseAdmin
                .from('vor_mor_submissions')
                .update(updates)
                .eq('id', id)
                .eq('organization_id', ctx.orgId);  // guard org en el update (RLS consistency)
            if (updateErr) throw updateErr;
        }

        // Notificar al reportante si tiene email y se solicitó
        if (notify_reporter && existing.reporter_email && notification_message?.trim()) {
            await notifyReporter({
                email: existing.reporter_email,
                reporterName: existing.is_anonymous ? null : existing.reporter_name,
                type: existing.type,
                submissionId: id,
                message: notification_message.trim(),
                newStatus: status || existing.status,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Email al reportante (sin revelar su identidad al equipo SMS)
// ─────────────────────────────────────────────────────────────────────────────
async function notifyReporter({ email, reporterName, type, submissionId, message, newStatus }) {
    try {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return;

        const resend = new Resend(resendKey);
        const saludo = reporterName ? `Hola ${escHtml(reporterName)},` : 'Hola,';
        const statusLabels = {
            recibido: 'Recibido',
            en_investigacion: 'En investigación',
            cerrado: 'Cerrado',
            archivado: 'Archivado',
        };
        const statusLabel = escHtml(statusLabels[newStatus] || newStatus);

        await resend.emails.send({
            from: 'BitaFly <no-reply@bitafly.com>',
            to: email,
            subject: `Actualización de tu reporte ${type} — Estado: ${statusLabel}`,
            html: `
                <p>${saludo}</p>
                <p>El equipo de Seguridad Operacional ha actualizado el estado de tu reporte <strong>${escHtml(type)}</strong>.</p>
                <p><strong>Estado actual:</strong> ${statusLabel}</p>
                <div style="background:#f8fafc;border-left:4px solid #0f172a;padding:12px 16px;margin:16px 0">
                    ${escHtml(message).replace(/\n/g, '<br>')}
                </div>
                <p style="color:#64748b;font-size:12px">Tu identidad permanece protegida. Este mensaje fue enviado por el equipo de SMS de la organización.</p>
                <p style="color:#64748b;font-size:12px">Referencia del reporte: ${escHtml(submissionId)}</p>
            `,
        });
    } catch (_) {
        // No crítico
    }
}
