import { createAdminClient } from '@/lib/supabaseServer';

/**
 * logCaseEvent — registra un evento real en la línea de tiempo de un caso
 * SMS/VOR/MOR (sms_case_events). Mismo patrón fire-and-forget que
 * lib/auditLog.js — nunca lanza, nunca bloquea la operación instrumentada.
 *
 * @param {object} p
 * @param {string} p.orgId
 * @param {string} [p.smsReportId] - exactamente uno de smsReportId/vorMorId
 * @param {string} [p.vorMorId]
 * @param {string} p.label
 * @param {string} [p.actorId]
 * @param {string} [p.actorName]
 */
export async function logCaseEvent({ orgId, smsReportId, vorMorId, label, actorId, actorName }) {
  if (!orgId || !label || (!smsReportId && !vorMorId)) return;
  try {
    const admin = createAdminClient();
    await admin.from('sms_case_events').insert([{
      organization_id: orgId,
      sms_report_id:   smsReportId || null,
      vor_mor_id:       vorMorId || null,
      label,
      actor_id:   actorId || null,
      actor_name: actorName || null,
    }]);
  } catch {
    // best-effort: la línea de tiempo nunca rompe la operación instrumentada.
  }
}
