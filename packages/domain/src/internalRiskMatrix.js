// internalRiskMatrix — la matriz de riesgo del SMS interno de la organización:
// CONFIGURABLE (regla C3, 01-reglas.md §5b), a diferencia de riskAnalysis.js
// (MAUT-5.0-12-055, fija por la autoridad, regla C2). Nunca deben mezclarse —
// son dos entidades distintas (18-analisis-riesgos-vuelo.md R1).
//
// Sin semilla OACI Doc 9859 hardcodeada a propósito: 40-sms.md §5.2 dice que
// "hoy se siembra OACI Doc 9859, se conserva", pero los valores exactos de esa
// semilla no están verificados contra una fuente en docs/skylog-v2/ — fabricar
// probabilidad/severidad/tolerabilidad "OACI" sin haber leído el documento
// violaría la regla V1 (no fabricar contenido normativo). Cada organización
// configura su propia matriz desde cero hasta que se consiga y verifique esa
// fuente (pendiente, documentado en 51-bitacora.md).

/**
 * Resuelve la zona de tolerabilidad para una combinación probabilidad×severidad
 * contra la matriz YA CONFIGURADA por la organización — nunca una tabla fija
 * (a diferencia de riskAnalysis.js#toleranceZone). `tolerability` es un array
 * de { probabilityCode, severityCode, zone }.
 */
export function resolveInternalToleranceZone(tolerability, probabilityCode, severityCode) {
  const cell = (tolerability || []).find(
    (c) => c.probabilityCode === probabilityCode && c.severityCode === severityCode
  );
  if (!cell) {
    return { zone: null, configured: false };
  }
  return { zone: cell.zone, configured: true };
}

/**
 * Valida que una matriz tenga una celda por cada combinación de los niveles
 * declarados de probabilidad/severidad — una matriz incompleta no debe usarse
 * para evaluar peligros reales (dejaría combinaciones sin criterio).
 */
export function validateMatrixCompleteness(probabilityLevels, severityLevels, tolerability) {
  const missing = [];
  for (const p of probabilityLevels || []) {
    for (const s of severityLevels || []) {
      const found = (tolerability || []).some((c) => c.probabilityCode === p.code && c.severityCode === s.code);
      if (!found) missing.push({ probabilityCode: p.code, severityCode: s.code });
    }
  }
  return { complete: missing.length === 0, missing };
}

/**
 * Evalúa un peligro registrado contra la matriz configurada de la
 * organización. `residual` es opcional — solo se evalúa si se proveen ambos
 * códigos residuales.
 */
export function evaluateInternalHazard({ tolerability, probabilityCode, severityCode, residualProbabilityCode, residualSeverityCode }) {
  const initial = resolveInternalToleranceZone(tolerability, probabilityCode, severityCode);
  if (!residualProbabilityCode || !residualSeverityCode) {
    return { initialZone: initial.zone, configured: initial.configured, residualZone: null };
  }
  const residual = resolveInternalToleranceZone(tolerability, residualProbabilityCode, residualSeverityCode);
  return { initialZone: initial.zone, configured: initial.configured && residual.configured, residualZone: residual.zone };
}
