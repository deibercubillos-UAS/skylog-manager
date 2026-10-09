// GET /api/cron/sms-deadlines — Vercel Cron (diario, V2).
// Avisa al Gerente SMS de (a) MOR sin radicar en IRIS cuyo plazo de 5 días hábiles entra en un hito
// (quedan 3, 1, 0 días hábiles, o recién venció) y (b) acciones correctivas vencidas o que vencen hoy.
// Sin tabla de "ya avisado": los hitos son fechas exactas, así que cada aviso sale una sola vez por hito.
// Un solo correo resumen por organización. Secured con Authorization: Bearer CRON_SECRET.
import { createNotifications } from '@/lib/v2/notify';
import { createAdminClient } from '@/lib/supabaseServer';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { computeReportDeadline } from '@skylog/domain';
import { sendAnalystMail } from '@/lib/v2/smsAlerts';
import { escHtml } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

const MILESTONES = [3, 1, 0, -1]; // días hábiles restantes en los que se avisa

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

const when = (n) => (n < 0 ? 'VENCIDO' : n === 0 ? 'vence HOY' : `quedan ${n} día${n === 1 ? '' : 's'} hábil${n === 1 ? '' : 'es'}`);

export async function GET(request) {
  if (!verifyAuth(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const admin = createAdminClient();
  const today = bogotaDay(new Date());

  const { data: reports, error } = await admin
    .from('sms_reports')
    .select('id, organization_id, route, occurred_at, created_at, filed_at, event_label, cases:sms_cases(status)')
    .eq('route', 'mor')
    .is('filed_at', null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: actions } = await admin
    .from('sms_case_actions')
    .select('id, organization_id, description, due_date, sms_cases!inner(status)')
    .is('done_at', null)
    .lte('due_date', today);

  const byOrg = new Map();
  const bucket = (org) => {
    if (!byOrg.has(org)) byOrg.set(org, { mors: [], actions: [] });
    return byOrg.get(org);
  };

  for (const r of reports || []) {
    const cases = Array.isArray(r.cases) ? r.cases : r.cases ? [r.cases] : [];
    if (cases.some((c) => c.status === 'cerrado')) continue;
    const d = computeReportDeadline(r, today);
    if (d.applicable && d.status !== 'radicado' && d.status !== 'radicado_tarde' && MILESTONES.includes(d.businessDaysLeft)) {
      bucket(r.organization_id).mors.push({ label: r.event_label || 'MOR', left: d.businessDaysLeft, deadline: d.deadline });
    }
  }
  for (const a of actions || []) {
    if (a.sms_cases?.status === 'cerrado') continue;
    bucket(a.organization_id).actions.push({ description: a.description, due: a.due_date });
  }

  let orgs = 0;
  let sent = 0;
  for (const [organizationId, { mors, actions: acts }] of byOrg) {
    if (mors.length === 0 && acts.length === 0) continue;
    const parts = [];
    if (mors.length) {
      parts.push(`<p style="font-size:14px;font-weight:700;color:#1A202C;margin:0 0 6px;">MOR pendientes de radicar en IRIS</p><ul style="margin:0 0 14px;padding-left:18px;font-size:13px;color:#4a5568;">${mors.map((m) => `<li>${escHtml(m.label)} — plazo ${escHtml(m.deadline)} (${escHtml(when(m.left))})</li>`).join('')}</ul>`);
    }
    if (acts.length) {
      parts.push(`<p style="font-size:14px;font-weight:700;color:#1A202C;margin:0 0 6px;">Acciones correctivas vencidas o que vencen hoy</p><ul style="margin:0;padding-left:18px;font-size:13px;color:#4a5568;">${acts.map((a) => `<li>${escHtml(a.description)} — ${escHtml(a.due)}</li>`).join('')}</ul>`);
    }
    await createNotifications({
      organizationId,
      roles: ['gerente_sms'],
      type: 'sms_plazo',
      title: `Plazos SMS: ${mors.length} MOR por radicar, ${acts.length} acción(es) vencida(s)`,
      body: null,
      link: '/sms/reportes',
      dedupeKey: `sms-plazo:${today}`,
    });
    const out = await sendAnalystMail({
      organizationId,
      subject: `Seguimiento SMS: ${mors.length} MOR por radicar, ${acts.length} acción(es) vencida(s)`,
      title: 'Plazos del seguimiento de sucesos',
      bodyHtml: parts.join(''),
      path: '/sms/reportes',
      ctaLabel: 'Abrir seguimiento',
    });
    orgs += 1;
    sent += out.sent || 0;
  }

  return Response.json({ today, organizations: orgs, emailsSent: sent });
}
