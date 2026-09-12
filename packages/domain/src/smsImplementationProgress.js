// smsImplementationProgress — asistente de implantación por fases
// (40-sms.md §5.2), lógica pura de qué fase está completa y qué desbloquea
// la siguiente. Cada fase desbloquea la próxima — no se "salta" una fase
// incompleta, mismo espíritu del diseño original ("% de avance visible, cada
// una desbloqueando la siguiente"). Con tests (regla Q2).

export const IMPLEMENTATION_PHASES = [
  { key: 'policy', label: 'Política y objetivos' },
  { key: 'risk', label: 'Gestión del riesgo' },
  { key: 'assurance', label: 'Aseguramiento' },
  { key: 'promotion', label: 'Promoción' },
  { key: 'acceptance', label: 'Listo para aceptación' },
];

/**
 * `input` trae los datos crudos ya consultados de Supabase (conteos/booleans,
 * nunca lógica de consulta aquí):
 *  - gsoDesignated, policySigned (fase 1)
 *  - riskMatrixConfigured, hazardsCount (fase 2)
 *  - indicatorsWithThreeMonthsData (fase 3 — cuántos indicadores activos
 *    tienen ≥3 meses de datos mensuales)
 *  - gapAssessmentCompleted (fase 3 — autoevaluación GAP; V2 no la construyó
 *    todavía, por eso siempre llega `false`/`undefined` hasta que exista —
 *    la función no fabrica el dato, solo lo refleja)
 *  - trainingSessionsWithAttendance (fase 4 — sesiones con ≥1 asistencia real)
 *  - msmsPublished (fase 4 — V2 no lo construyó todavía, mismo criterio que GAP)
 */
export function computeImplementationProgress(input = {}) {
  const phase1 = !!input.gsoDesignated && !!input.policySigned;
  const phase2 = phase1 && !!input.riskMatrixConfigured && (input.hazardsCount || 0) > 0;
  const phase3 = phase2 && (input.indicatorsWithThreeMonthsData || 0) >= 3 && !!input.gapAssessmentCompleted;
  const phase4 = phase3 && (input.trainingSessionsWithAttendance || 0) > 0 && !!input.msmsPublished;
  const phase5 = phase4; // expediente de aceptación — descargable solo cuando las 4 previas están completas

  const phases = { policy: phase1, risk: phase2, assurance: phase3, promotion: phase4, acceptance: phase5 };
  const completedCount = Object.values(phases).filter(Boolean).length;

  return {
    phases,
    completedCount,
    totalPhases: IMPLEMENTATION_PHASES.length,
    progressPct: (completedCount / IMPLEMENTATION_PHASES.length) * 100,
    currentPhase: IMPLEMENTATION_PHASES.find((p) => !phases[p.key])?.key || null,
  };
}
