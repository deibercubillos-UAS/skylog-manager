// GET /api/cron/vormor-deadline-reminder — Vercel Cron (diario)
//
// Directiva 02-24: el Gerente de SMS debe radicar el MOR en IRIS dentro de
// 5 días hábiles desde la ocurrencia. VOR no tiene plazo regulatorio, pero
// usa el mismo mecanismo como plazo interno sugerido (decisión confirmada
// con el usuario, ver docs/plan-mejora-sms-bitafly.md, Fase 6). Este cron
// recuerda (campana) al Gerente SMS + Gerente General mientras un caso no
// se haya marcado como radicado (aerocivil_notified_at), dentro de los 3
// días previos al plazo y mientras siga vencido — mismo patrón de dedupe
// que /api/cron/training-exam-reminder.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotifications } from '@/lib/notify';
import { computeCaseCompliance } from '@/lib/vorMorCompliance';

export const dynamic = 'force-dynamic';

const REMIND_BEFORE_DAYS = 3;
const DEDUPE_DAYS = 3;

function makeAdmin() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function verifyAuth(request) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

async function alreadyNotified(admin, { orgId, caseId }) {
    const since = new Date(Date.now() - DEDUPE_DAYS * 86400000).toISOString();
    const { data } = await admin
        .from('notifications')
        .select('id')
        .eq('type', 'vormor_deadline_due')
        .eq('organization_id', orgId)
        .contains('metadata', { case_id: caseId })
        .gte('created_at', since)
        .limit(1);
    return (data || []).length > 0;
}

export async function GET(request) {
    if (!verifyAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const admin = makeAdmin();
    const results = { notified: 0, alreadySent: 0, skippedDedup: 0, compliant: 0, errors: [] };

    try {
        const { data: cases } = await admin
            .from('vor_mor_submissions')
            .select('id, organization_id, type, occurrence_date, created_at, aerocivil_notified_at')
            .is('aerocivil_notified_at', null);

        for (const c of cases || []) {
            try {
                const compliance = computeCaseCompliance(c);
                if (!compliance) continue;
                const dueSoon = compliance.status === 'pendiente' && compliance.daysLeft <= REMIND_BEFORE_DAYS;
                const mustAlert = compliance.status === 'vencido' || dueSoon;

                if (!mustAlert) { results.compliant++; continue; }
                if (await alreadyNotified(admin, { orgId: c.organization_id, caseId: c.id })) { results.skippedDedup++; continue; }

                const typeLabel = c.type === 'MOR' ? 'MOR (plazo regulatorio)' : 'VOR (plazo interno sugerido)';
                const message = compliance.status === 'vencido'
                    ? `Venció el plazo (${compliance.deadline}) para radicar un reporte ${typeLabel} en IRIS.`
                    : `Quedan ${compliance.daysLeft} día(s) para radicar un reporte ${typeLabel} en IRIS (plazo: ${compliance.deadline}).`;

                const count = await createNotifications({
                    orgId: c.organization_id,
                    roles: ['gerente_sms', 'admin'],
                    type: 'vormor_deadline_due',
                    title: `Reporte ${c.type} pendiente de radicar en IRIS`,
                    body: message,
                    link: '/dashboard/safety?tab=plazos',
                    metadata: { case_id: c.id },
                });
                if (count > 0) results.notified++;
            } catch (err) {
                results.errors.push(`case ${c.id}: ${err.message}`);
            }
        }
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }

    console.log('[cron/vormor-deadline-reminder] done', results);
    return NextResponse.json(results);
}
