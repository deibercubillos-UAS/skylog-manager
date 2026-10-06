// insuranceCoverage — vigencia y cobertura de pólizas (RAC 100 §100.535(27) y
// §100.410(a)(2)(i): la póliza RCE debe estar vigente durante TODO el periodo
// de la operación y cubrir la aeronave). Lógica pura, sin Supabase, con tests
// (regla Q2). Las fechas son 'YYYY-MM-DD' (columnas `date`): se comparan como
// texto y la fecha de hoy la inyecta quien llama — sin Date.now() ni zonas
// horarias adentro, para que el resultado sea determinista.

export const POLICY_TYPES = ['rce', 'casco', 'otra'];
export const POLICY_EXPIRY_WARNING_DAYS = 30;

function toUtcDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Días calendario entre dos fechas 'YYYY-MM-DD' (to - from). */
export function daysBetween(fromDate, toDate) {
  return Math.round((toUtcDay(toDate) - toUtcDay(fromDate)) / 86_400_000);
}

/**
 * Estado de vigencia de una póliza a la fecha `today`.
 * futura (aún no inicia) · vigente · por_vencer (≤ warnDays) · vencida.
 * `daysLeft` es null cuando está vencida o es futura.
 */
export function computePolicyStatus(policy, today, warnDays = POLICY_EXPIRY_WARNING_DAYS) {
  if (!policy?.start_date || !policy?.end_date) return { status: 'sin_datos', daysLeft: null };
  if (today < policy.start_date) return { status: 'futura', daysLeft: null };
  if (today > policy.end_date) return { status: 'vencida', daysLeft: null };
  const daysLeft = daysBetween(today, policy.end_date);
  return { status: daysLeft <= warnDays ? 'por_vencer' : 'vigente', daysLeft };
}

/** ¿La póliza cubre esta aeronave? Sin lista de aeronaves + covers_all_fleet = toda la flota. */
export function policyCoversAircraft(policy, aircraftId) {
  if (policy.covers_all_fleet) return true;
  return (policy.aircraft_ids || []).includes(aircraftId);
}

/**
 * ¿Existe una póliza RCE activa que cubra la aeronave durante TODO el periodo
 * [startDate, endDate]? Devuelve la póliza que cubre, o la razón por la que
 * no hay cobertura (para mostrarla tal cual en el checklist de autorización).
 */
export function findRceCoverage(policies, { aircraftId, startDate, endDate }) {
  const rce = (policies || []).filter((p) => p.policy_type === 'rce' && p.is_active !== false);
  if (rce.length === 0) return { covered: false, policy: null, reason: 'sin_poliza_rce' };

  const forAircraft = rce.filter((p) => policyCoversAircraft(p, aircraftId));
  if (forAircraft.length === 0) return { covered: false, policy: null, reason: 'aeronave_sin_cobertura' };

  const covering = forAircraft.find((p) => p.start_date <= startDate && p.end_date >= endDate);
  if (covering) return { covered: true, policy: covering, reason: null };

  return { covered: false, policy: null, reason: 'vigencia_no_cubre_el_periodo' };
}

export const COVERAGE_REASON_LABELS = {
  sin_poliza_rce: 'No hay una póliza RCE registrada',
  aeronave_sin_cobertura: 'Ninguna póliza RCE cubre esta aeronave',
  vigencia_no_cubre_el_periodo: 'La póliza RCE no está vigente durante todo el periodo de la operación',
};

/** Resumen por estado para la franja de indicadores. */
export function summarizePolicies(policies, today) {
  const summary = { total: 0, vigente: 0, por_vencer: 0, vencida: 0, futura: 0 };
  for (const p of policies || []) {
    if (p.is_active === false) continue;
    summary.total += 1;
    const { status } = computePolicyStatus(p, today);
    if (status in summary) summary[status] += 1;
  }
  return summary;
}

/**
 * Checklist de autorización (RAC 100 §100.805(a)(1)): ¿la flota tiene póliza RCE
 * vigente durante TODO el periodo de la solicitud? `authorization_requests` es
 * una campaña (zona + fechas), no nombra aeronaves, así que se evalúa cada
 * aeronave operativa de la flota y se reporta cuántas quedan cubiertas.
 *  - ok: todas cubiertas · partial: algunas · none: ninguna · no_aircraft: flota vacía.
 * `missingDocument` lista las pólizas que sí cubren pero no tienen certificado
 * adjunto: la norma exige adjuntarlo al radicar, no solo tener la póliza.
 * Las aeronaves `fuera_de_servicio` no se evalúan: no van a operar.
 */
export function evaluateRceForAuthorization(policies, aircraftList, { startDate, endDate }) {
  const inScope = (aircraftList || []).filter((a) => a.operational_status !== 'fuera_de_servicio');
  const byAircraft = inScope.map((a) => {
    const r = findRceCoverage(policies, { aircraftId: a.id, startDate, endDate });
    return { aircraftId: a.id, covered: r.covered, reason: r.reason, policyId: r.policy?.id ?? null };
  });

  const coveredCount = byAircraft.filter((x) => x.covered).length;
  let status;
  if (byAircraft.length === 0) status = 'no_aircraft';
  else if (coveredCount === byAircraft.length) status = 'ok';
  else if (coveredCount === 0) status = 'none';
  else status = 'partial';

  const usedIds = new Set(byAircraft.map((x) => x.policyId).filter(Boolean));
  const missingDocument = (policies || []).filter((p) => usedIds.has(p.id) && !p.document_path).map((p) => p.id);

  return { status, total: byAircraft.length, coveredCount, byAircraft, policyIds: [...usedIds], missingDocument };
}
