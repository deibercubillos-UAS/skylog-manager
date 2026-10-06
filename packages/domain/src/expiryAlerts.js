// expiryAlerts — vencimientos de documentos de la organización que merecen atención en el Centro de Control:
// pólizas y CDO-U. Lógica pura (`today` inyectado, fechas 'YYYY-MM-DD'). Solo avisa: nada bloquea la operación.
// Si la organización no tiene pólizas registradas NO se avisa (la póliza es opcional); sí cuando una que
// existía venció sin que haya otra vigente del mismo tipo que la reemplace.
import { computePolicyStatus, daysBetween } from './insuranceCoverage.js';

export const CDO_WARNING_DAYS = 60;
const POLICY_LABEL = { rce: 'RCE', casco: 'de casco', otra: '' };

const policyName = (p) => `Póliza ${POLICY_LABEL[p.policy_type] || ''} ${p.insurer ? `· ${p.insurer}` : ''}`.replace(/\s+/g, ' ').trim();

/** Devuelve [{ key, severity: 'bad' | 'warn', title, detail, href }] ordenado: lo vencido primero. */
export function computeExpiryAlerts({ policies, cert }, today) {
  const alerts = [];
  const active = (policies || []).filter((p) => p.is_active !== false);

  for (const p of active) {
    const { status, daysLeft } = computePolicyStatus(p, today);
    if (status === 'por_vencer') {
      alerts.push({ key: `pol-${p.id}`, severity: 'warn', title: `${policyName(p)} vence pronto`, detail: `Vence el ${p.end_date} (en ${daysLeft} día${daysLeft === 1 ? '' : 's'}).`, href: '/polizas' });
    } else if (status === 'vencida') {
      // Si otra póliza vigente del mismo tipo la reemplaza, la vencida es historia, no una alerta.
      const replaced = active.some((q) => q.id !== p.id && q.policy_type === p.policy_type && ['vigente', 'por_vencer'].includes(computePolicyStatus(q, today).status));
      if (!replaced) {
        alerts.push({ key: `pol-${p.id}`, severity: 'bad', title: `${policyName(p)} vencida`, detail: `Venció el ${p.end_date} y no hay otra vigente del mismo tipo.`, href: '/polizas' });
      }
    }
  }

  if (cert?.cdo_number && cert.expires_at) {
    const left = daysBetween(today, cert.expires_at);
    if (left < 0) alerts.push({ key: 'cdo', severity: 'bad', title: 'CDO-U vencido', detail: `Venció el ${cert.expires_at}.`, href: '/organizacion' });
    else if (left <= CDO_WARNING_DAYS) alerts.push({ key: 'cdo', severity: 'warn', title: 'CDO-U por vencer', detail: `Vence el ${cert.expires_at} (en ${left} día${left === 1 ? '' : 's'}).`, href: '/organizacion' });
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'bad' ? -1 : 1));
}
