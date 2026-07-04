// GET /api/cron/spi-annual-reminder — Vercel Cron (diario)
//
// Circular MAUT-1.0-22-005: los Indicadores SPI del año vencido deben
// entregarse a Aerocivil antes del 30 de marzo de cada vigencia. Este cron
// NO genera ni envía el archivo — solo recuerda (campana) al Gerente SMS
// (responsable) + Gerente General (copia) mientras el año anterior no se
// haya marcado como enviado desde /dashboard/reports (o el hub Seguridad
// SMS). Ver CLAUDE.md "Seguridad SMS" / Indicadores (SPI).
//
// Secured con Authorization: Bearer CRON_SECRET (mismo patrón que
// /api/cron/aerocivil-report-reminder). Recuerda dentro de los 30 días
// previos al plazo, y sigue recordando (con dedupe de 3 días) si ya venció
// y sigue sin marcarse enviado — mismo espíritu que /api/cron/training-exam-reminder.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotifications } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const DEDUPE_DAYS = 3;

function makeAdmin() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function verifyAuth(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

async function alreadyNotified(admin, { orgId, reportYear }) {
    const since = new Date(Date.now() - DEDUPE_DAYS * 86400000).toISOString();
    const { data } = await admin
        .from('notifications')
        .select('id')
        .eq('type', 'spi_report_due')
        .eq('organization_id', orgId)
        .contains('metadata', { year: reportYear })
        .gte('created_at', since)
        .limit(1);
    return (data || []).length > 0;
}

export async function GET(request) {
    if (!verifyAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const now = new Date();
    const year = now.getUTCFullYear();
    const reportYear = year - 1;
    const deadline = new Date(Date.UTC(year, 2, 30)); // 30 de marzo
    const daysLeft = Math.ceil((deadline - now) / 86400000);

    // Fuera de la ventana de recordatorio (más de 30 días antes del plazo) — no
    // molestar desde enero.
    if (daysLeft > 30) {
        return NextResponse.json({ skipped: true, reason: 'fuera de la ventana de recordatorio', daysLeft });
    }

    const admin = makeAdmin();
    const results = { notified: 0, alreadySent: 0, skippedDedup: 0, errors: [] };

    try {
        const { data: orgs } = await admin.from('organizations').select('id, company_name');

        for (const org of orgs || []) {
            try {
                const { data: statusRow } = await admin
                    .from('safety_indicator_submissions')
                    .select('sent_at')
                    .eq('organization_id', org.id)
                    .eq('year', reportYear)
                    .maybeSingle();

                if (statusRow?.sent_at) { results.alreadySent++; continue; }
                if (await alreadyNotified(admin, { orgId: org.id, reportYear })) { results.skippedDedup++; continue; }

                const message = daysLeft >= 0
                    ? `Quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} para enviar los Indicadores SPI de ${reportYear} a Aerocivil.`
                    : `Venció el plazo (30 de marzo) para enviar los Indicadores SPI de ${reportYear} a Aerocivil.`;

                const count = await createNotifications({
                    orgId: org.id,
                    roles: ['gerente_sms', 'admin'],
                    type: 'spi_report_due',
                    title: `Indicadores SPI pendientes — ${reportYear}`,
                    body: message,
                    link: '/dashboard/safety?tab=indicadores',
                    metadata: { year: reportYear },
                });
                if (count > 0) results.notified++;
            } catch (err) {
                results.errors.push(`org ${org.id}: ${err.message}`);
            }
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    console.log('[cron/spi-annual-reminder] done', { reportYear, daysLeft, ...results });
    return NextResponse.json({ reportYear, daysLeft, ...results });
}
