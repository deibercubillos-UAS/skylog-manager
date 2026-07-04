// GET /api/cron/training-exam-reminder — Vercel Cron (diario)
//
// Recuerda a cada piloto que su examen interno de Capacitación (Operaciones o
// Mantenimiento) está próximo a vencer o ya venció/reprobó — vía campana
// in-app + correo (Resend). Ver CLAUDE.md "Capacitación".
//
// Secured con Authorization: Bearer CRON_SECRET (mismo patrón que
// /api/cron/aerocivil-report-reminder).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createNotifications } from '@/lib/notify';
import { computeCompliance } from '@/lib/trainingCompliance';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

const TYPE_LABELS = { operaciones: 'Operaciones', mantenimiento: 'Mantenimiento' };
const REMIND_BEFORE_DAYS = 3;   // avisar "próximo a vencer" dentro de estos días
const DEDUPE_DAYS = 3;          // no repetir el mismo aviso antes de este plazo

function makeAdmin() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function verifyAuth(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

async function alreadyNotified(admin, { examId, pilotId }) {
    const since = new Date(Date.now() - DEDUPE_DAYS * 86400000).toISOString();
    const { data } = await admin
        .from('notifications')
        .select('id')
        .eq('type', 'training_exam_due')
        .contains('metadata', { exam_id: examId, pilot_id: pilotId })
        .gte('created_at', since)
        .limit(1);
    return (data || []).length > 0;
}

async function sendEmail({ resend, to, name, typeLabel, statusLabel, message, link }) {
    if (!resend || !to) return;
    try {
        await resend.emails.send({
            from: 'BitaFly <no-reply@bitafly.com>',
            to,
            subject: `Examen de ${typeLabel} — ${statusLabel}`,
            html: `
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:sans-serif;">
                    ${emailHeader()}
                    <tr><td style="padding:32px 40px;">
                        <p>Hola ${name ? escHtml(name) : ''},</p>
                        <p>${escHtml(message)}</p>
                        <p style="margin-top:24px;">
                            <a href="${escHtml(link)}" style="background:#ec5b13;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Presentar examen</a>
                        </p>
                    </td></tr>
                    ${emailFooter()}
                </table>
            `,
        });
    } catch (err) {
        console.warn('[cron/training-exam-reminder] email falló:', err.message);
    }
}

export async function GET(request) {
    if (!verifyAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const admin = makeAdmin();
    const resendKey = process.env.RESEND_API_KEY;
    const resend = resendKey ? new Resend(resendKey) : null;
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com').replace(/\/$/, '');

    const results = { notified: 0, skippedDedup: 0, compliant: 0, errors: [] };

    try {
        const { data: exams } = await admin.from('training_exams').select('*');

        for (const exam of exams || []) {
            try {
                const { data: pilots } = await admin
                    .from('pilots')
                    .select('id, name, email, profile_id')
                    .eq('organization_id', exam.organization_id);

                const { data: attempts } = await admin
                    .from('training_exam_attempts')
                    .select('pilot_id, cycle_start, passed')
                    .eq('exam_id', exam.id);

                for (const pilot of pilots || []) {
                    const pilotAttempts = (attempts || []).filter(a => a.pilot_id === pilot.id);
                    const compliance = computeCompliance(exam, pilotAttempts);

                    const daysToDeadline = Math.ceil((new Date(`${compliance.cycleEnd}T00:00:00`) - new Date()) / 86400000);
                    const dueSoon = compliance.status === 'pending' && daysToDeadline <= REMIND_BEFORE_DAYS;
                    const mustAlert = compliance.status === 'overdue' || compliance.status === 'failed' || dueSoon;

                    if (!mustAlert) { results.compliant++; continue; }
                    if (await alreadyNotified(admin, { examId: exam.id, pilotId: pilot.id })) { results.skippedDedup++; continue; }

                    const typeLabel = TYPE_LABELS[exam.type] || exam.type;
                    const statusLabel = compliance.status === 'overdue' ? 'Vencido'
                        : compliance.status === 'failed' ? 'Reprobado' : 'Próximo a vencer';
                    const message = compliance.status === 'overdue'
                        ? `Tu examen de ${typeLabel} venció el ${compliance.cycleEnd} sin presentarlo. Preséntalo lo antes posible.`
                        : compliance.status === 'failed'
                            ? `Agotaste los intentos de tu examen de ${typeLabel} en el ciclo actual (hasta ${compliance.cycleEnd}).`
                            : `Tu examen de ${typeLabel} vence el ${compliance.cycleEnd}. Te quedan ${compliance.attemptsLeft} intento(s).`;
                    const link = `/dashboard/training/exam?type=${exam.type}`;

                    if (pilot.profile_id) {
                        await createNotifications({
                            orgId: exam.organization_id,
                            profileIds: [pilot.profile_id],
                            type: 'training_exam_due',
                            title: `Examen de ${typeLabel} — ${statusLabel}`,
                            body: message,
                            link,
                            metadata: { exam_id: exam.id, pilot_id: pilot.id },
                        });
                    }
                    await sendEmail({ resend, to: pilot.email, name: pilot.name, typeLabel, statusLabel, message, link: `${siteUrl}${link}` });

                    results.notified++;
                }
            } catch (err) {
                results.errors.push(`exam ${exam.id}: ${err.message}`);
            }
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    console.log('[cron/training-exam-reminder] done', results);
    return NextResponse.json(results);
}
