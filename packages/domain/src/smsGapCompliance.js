// smsGapCompliance — autoevaluación GAP del Apéndice 1 (MAUT-5.0-22-017,
// catálogo de 100 preguntas porteado verbatim desde v1, verificado contra la
// base real — 40-sms.md §5.9 sub-frente SMS-D). El % de cumplimiento se
// calcula aquí, nunca se guarda como columna derivada (mismo criterio ya
// usado en zonas de riesgo / indicadores SPI). Lógica pura, con tests.

/**
 * `responses` es un array de { componentNumber, response } ('si'|'no') de
 * UNA evaluación. Agrega por componente y total.
 */
export function computeGapStats(responses = []) {
  const byComponent = {};
  for (const r of responses) {
    const c = byComponent[r.componentNumber] || { total: 0, yes: 0 };
    c.total += 1;
    if (r.response === 'si') c.yes += 1;
    byComponent[r.componentNumber] = c;
  }
  for (const key of Object.keys(byComponent)) {
    byComponent[key].pct = byComponent[key].total ? (byComponent[key].yes / byComponent[key].total) * 100 : 0;
  }

  const total = responses.length;
  const yes = responses.filter((r) => r.response === 'si').length;

  return {
    total,
    yes,
    pct: total ? (yes / total) * 100 : 0,
    byComponent,
  };
}

/**
 * Compara dos evaluaciones (`computeGapStats()` ya aplicado a cada una) —
 * variación de cumplimiento total y por componente respecto de la anterior.
 * `previous` null si es la primera evaluación de la organización.
 */
export function compareGapAssessments(current, previous) {
  if (!previous) return { totalDelta: null, byComponentDelta: {} };

  const byComponentDelta = {};
  for (const key of Object.keys(current.byComponent)) {
    const curPct = current.byComponent[key]?.pct ?? 0;
    const prevPct = previous.byComponent[key]?.pct;
    byComponentDelta[key] = prevPct == null ? null : curPct - prevPct;
  }

  return {
    totalDelta: current.pct - previous.pct,
    byComponentDelta,
  };
}
