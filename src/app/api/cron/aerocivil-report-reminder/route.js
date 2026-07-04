// GET /api/cron/aerocivil-report-reminder — Vercel Cron (diario)
//
// Circular AeroCivil 2026351070026944: reporte operacional UAS mensual, dentro
// de los primeros 5 días de cada mes vencido. Este cron NO genera ni envía el
// archivo — solo recuerda (campana) al Gerente SMS (responsable) + Gerente
// General (copia) mientras el período anterior no se haya marcado como enviado
// desde /dashboard/reports. Ver CLAUDE.md "Reporte Operacional Mensual UAS".
//
// Secured con Authorization: Bearer CRON_SECRET (mismo patrón que /api/cron/free-grants)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createNotifications } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

// Período (mes vencido) que corresponde reportar, en formato 'YYYY-MM'
function previousPeriod() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const today = new Date();
  const dayOfMonth = today.getUTCDate();
  if (dayOfMonth > 5) {
    return NextResponse.json({ skipped: true, reason: 'fuera de la ventana de los primeros 5 días' });
  }

  const admin = makeAdmin();
  const period = previousPeriod();
  const daysLeft = Math.max(0, 5 - dayOfMonth);

  const results = { notified: 0, alreadySent: 0, errors: [] };

  try {
    const { data: orgs } = await admin.from('organizations').select('id, company_name');

    for (const org of orgs || []) {
      try {
        const { data: statusRow } = await admin
          .from('aerocivil_monthly_reports')
          .select('sent_at')
          .eq('organization_id', org.id)
          .eq('period', period)
          .maybeSingle();

        if (statusRow?.sent_at) { results.alreadySent++; continue; }

        const count = await createNotifications({
          orgId: org.id,
          roles: ['gerente_sms', 'admin'],
          type: 'aerocivil_report_due',
          title: `Reporte AeroCivil pendiente — ${period}`,
          body: daysLeft > 0
            ? `Quedan ${daysLeft} día${daysLeft === 1 ? '' : 's'} para enviar el reporte operacional UAS de ${period} a gouas@aerocivil.gov.co.`
            : `Hoy vence el plazo para enviar el reporte operacional UAS de ${period} a gouas@aerocivil.gov.co.`,
          link: '/dashboard/reports',
          metadata: { period },
        });
        if (count > 0) results.notified++;
      } catch (err) {
        results.errors.push(`org ${org.id}: ${err.message}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  console.log('[cron/aerocivil-report-reminder] done', { period, dayOfMonth, ...results });
  return NextResponse.json({ period, dayOfMonth, ...results });
}
