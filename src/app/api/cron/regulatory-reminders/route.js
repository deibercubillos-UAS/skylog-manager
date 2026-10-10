// GET /api/cron/regulatory-reminders — Vercel Cron (diario, V2). Reemplaza los 3 recordatorios de v1 que se retiraron:
//  1. Evaluaciones de capacitación (7/3/1 días, hoy, vencida, intentos agotados) → la persona, y a los gestores si vence.
//  2. Envío anual de indicadores SPI a la Aerocivil (antes del 30 de marzo) → Gerente SMS + Gerente General.
//  3. Paquete mensual SMS a la Aerocivil (primeros 5 días hábiles del mes vencido) → Gerente SMS + Gerente General.
// Cada hito se avisa UNA vez (clave de deduplicación por persona) y, si el cron falla un día, sale al siguiente.
// Las reglas viven en @skylog/domain (regulatoryReminders.js, con pruebas). Secured con Authorization: Bearer CRON_SECRET.
import { createAdminClient } from '@/lib/supabaseServer';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { createNotifications } from '@/lib/v2/notify';
import { sendAnalystMail, sendPeopleMail } from '@/lib/v2/smsAlerts';
import { escHtml } from '@/lib/emailHelpers';
import { computeEvaluationCompliance, evaluationReminder, spiAnnualReminder, monthlyReportReminder } from '@skylog/domain';

export const dynamic = 'force-dynamic';

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const shiftDay = (day, delta) => new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);

function evaluationCopy(ev, r) {
  const t = `«${ev.title}»`;
  switch (r.milestone) {
    case 'hoy': return { title: `Hoy vence la evaluación ${t}`, body: 'Presenta tu evaluación hoy para no quedar bloqueado.' };
    case 'vencida': return { title: `Venció la evaluación ${t}`, body: 'No la aprobaste a tiempo; presentarla ahora es necesario para volver a despachar.' };
    case 'agotada': return { title: `Agotaste los intentos de ${t}`, body: 'Habla con tu Jefe de Pilotos para que habilite un nuevo intento.' };
    default: return { title: `La evaluación ${t} vence en ${plural(r.daysLeft, 'día', 'días')}`, body: `Fecha límite: ${ev.due_date}.` };
  }
}

async function evaluations(admin, today) {
  const stats = { notified: 0, emails: 0, managers: 0 };
  const { data: evals, error } = await admin.from('capacitacion_evaluations').select('id, organization_id, type, title, due_date, max_attempts').gte('due_date', shiftDay(today, -60));
  if (error) throw error;
  if (!evals?.length) return stats;
  const orgIds = [...new Set(evals.map((e) => e.organization_id))];
  const [{ data: members }, { data: attempts }] = await Promise.all([
    admin.from('memberships').select('organization_id, person_id, role').in('organization_id', orgIds).eq('status', 'activa').neq('role', 'superadmin'),
    admin.from('capacitacion_evaluation_attempts').select('evaluation_id, person_id, passed').in('evaluation_id', evals.map((e) => e.id)),
  ]);
  const asOf = new Date(`${today}T12:00:00`); // «vencida» = ya pasó el día límite, en el calendario de Bogotá
  const byKey = new Map(); // `${evaluationId}|${milestone}` → { ev, r, persons[] }

  for (const ev of evals) {
    const roster = [...new Set((members || []).filter((m) => m.organization_id === ev.organization_id).map((m) => m.person_id))];
    for (const personId of roster) {
      const mine = (attempts || []).filter((a) => a.evaluation_id === ev.id && a.person_id === personId).map((a) => ({ passed: a.passed }));
      const compliance = computeEvaluationCompliance({ id: ev.id, dueDate: ev.due_date, maxAttempts: ev.max_attempts }, mine, asOf);
      const r = evaluationReminder(compliance, today);
      if (!r) continue;
      const k = `${ev.id}|${r.milestone}`;
      if (!byKey.has(k)) byKey.set(k, { ev, r, persons: [] });
      byKey.get(k).persons.push(personId);
    }
  }

  for (const { ev, r, persons } of byKey.values()) {
    const copy = evaluationCopy(ev, r);
    const out = await createNotifications({ organizationId: ev.organization_id, personIds: persons, type: 'vencimiento', title: copy.title, body: copy.body, link: '/capacitacion', dedupeKey: `eval:${ev.id}:${r.milestone}`, includeActor: true }, admin);
    stats.notified += out.created || 0;
    // Correo individual solo a quien acaba de recibir el aviso, y no en el primer hito (7 días): la campana basta.
    if (r.milestone !== '7d') {
      for (const personId of out.personIds || []) {
        const mail = await sendPeopleMail({ personIds: [personId], subject: copy.title, title: copy.title, bodyHtml: `<p style="font-size:14px;color:#4a5568;margin:0;">${escHtml(copy.body)}</p>`, path: '/capacitacion', ctaLabel: 'Ir a Capacitación' });
        stats.emails += mail.sent || 0;
      }
    }
    // A los gestores: un resumen cuando venció, y un aviso por persona cuando agotó los intentos.
    if (r.milestone === 'vencida') {
      const m = await createNotifications({ organizationId: ev.organization_id, roles: ['admin', 'jefe_pilotos'], type: 'vencimiento', title: `Venció «${ev.title}»: ${plural(persons.length, 'persona sin aprobar', 'personas sin aprobar')}`, body: 'Quienes no la aprobaron quedan bloqueados para despachar.', link: '/capacitacion', dedupeKey: `evalmgr:${ev.id}:vencida`, includeActor: true }, admin);
      stats.managers += m.created || 0;
    } else if (r.milestone === 'agotada') {
      for (const personId of persons) {
        const { data: who } = await admin.from('people').select('full_name').eq('id', personId).maybeSingle();
        const m = await createNotifications({ organizationId: ev.organization_id, roles: ['admin', 'jefe_pilotos'], type: 'vencimiento', title: `${who?.full_name || 'Una persona'} agotó los intentos de «${ev.title}»`, body: 'Queda bloqueada para despachar hasta que apruebe.', link: '/capacitacion', dedupeKey: `evalmgr:${ev.id}:${personId}:agotada`, includeActor: true }, admin);
        stats.managers += m.created || 0;
      }
    }
  }
  return stats;
}

async function spi(admin, today) {
  const stats = { orgs: 0, notified: 0, emails: 0 };
  const probe = spiAnnualReminder({ today });
  if (!probe) return stats; // fuera de la ventana de avisos: no hay nada que consultar
  const { data: orgs } = await admin.from('organizations').select('id, created_at');
  const { data: subs } = await admin.from('sms_indicator_submissions').select('organization_id, year');
  for (const org of orgs || []) {
    if (org.created_at.slice(0, 4) > String(probe.reportYear)) continue; // la organización no existía en esa vigencia
    const submittedYears = (subs || []).filter((s) => s.organization_id === org.id).map((s) => s.year);
    const r = spiAnnualReminder({ today, submittedYears });
    if (!r) continue;
    stats.orgs += 1;
    const title = r.milestone === 'vencido' ? `Venció el envío de indicadores SPI ${r.reportYear} a la Aerocivil` : r.milestone === 'hoy' ? `Hoy vence el envío de indicadores SPI ${r.reportYear}` : `Faltan ${plural(r.daysLeft, 'día', 'días')} para enviar los indicadores SPI ${r.reportYear}`;
    const body = `Plazo: antes del 30 de marzo de ${r.reportYear + 1}. Al enviarlos, márcalo en Indicadores (SPI).`;
    const out = await createNotifications({ organizationId: org.id, roles: ['gerente_sms', 'admin'], type: 'vencimiento', title, body, link: '/sms/indicadores', dedupeKey: `spi:${r.reportYear}:${r.milestone}`, includeActor: true }, admin);
    stats.notified += out.created || 0;
    if (out.created) {
      const mail = await sendAnalystMail({ organizationId: org.id, subject: title, title, bodyHtml: `<p style="font-size:14px;color:#4a5568;margin:0;">${escHtml(body)}</p>`, path: '/sms/indicadores', ctaLabel: 'Abrir indicadores' });
      stats.emails += mail.sent || 0;
    }
  }
  return stats;
}

async function monthly(admin, today) {
  const stats = { orgs: 0, notified: 0, emails: 0 };
  const { data: orgs } = await admin.from('organizations').select('id, created_at');
  const { data: sent } = await admin.from('sms_monthly_reports').select('organization_id, period');
  for (const org of orgs || []) {
    const sentPeriods = (sent || []).filter((s) => s.organization_id === org.id).map((s) => s.period);
    const r = monthlyReportReminder({ today, sentPeriods });
    if (!r) continue;
    if (org.created_at.slice(0, 7) > r.period) continue; // la organización no existía en ese período
    stats.orgs += 1;
    const title = r.milestone === 'vencido' ? `Venció el paquete mensual SMS de ${r.period} a la Aerocivil` : r.milestone === 'hoy' ? `Hoy vence el paquete mensual SMS de ${r.period}` : r.milestone === 'abierto' ? `Ya puedes enviar el paquete mensual SMS de ${r.period}` : `Faltan ${plural(r.daysLeft, 'día hábil', 'días hábiles')} para el paquete mensual SMS de ${r.period}`;
    const body = `Plazo: ${r.deadline} (primeros 5 días hábiles del mes, RAC 100 §100.535). Al enviarlo, márcalo en Reporte Mensual SMS.`;
    const out = await createNotifications({ organizationId: org.id, roles: ['gerente_sms', 'admin'], type: 'vencimiento', title, body, link: '/sms/reporte-mensual', dedupeKey: `mensual:${r.period}:${r.milestone}`, includeActor: true }, admin);
    stats.notified += out.created || 0;
    if (out.created) {
      const mail = await sendAnalystMail({ organizationId: org.id, subject: title, title, bodyHtml: `<p style="font-size:14px;color:#4a5568;margin:0;">${escHtml(body)}</p>`, path: '/sms/reporte-mensual', ctaLabel: 'Abrir reporte mensual' });
      stats.emails += mail.sent || 0;
    }
  }
  return stats;
}

export async function GET(request) {
  if (!verifyAuth(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });
  const admin = createAdminClient();
  // `?today=YYYY-MM-DD` (solo con el secreto del cron) permite ensayar una fecha futura o reponer un día perdido.
  const override = new URL(request.url).searchParams.get('today');
  const today = /^\d{4}-\d{2}-\d{2}$/.test(override || '') ? override : bogotaDay(new Date());
  const out = { today };
  for (const [key, fn] of [['evaluaciones', evaluations], ['spi', spi], ['mensual', monthly]]) {
    try {
      out[key] = await fn(admin, today);
    } catch (e) {
      console.error(`[regulatory-reminders] ${key}:`, e.message);
      out[key] = { error: e.message };
    }
  }
  return Response.json(out);
}
