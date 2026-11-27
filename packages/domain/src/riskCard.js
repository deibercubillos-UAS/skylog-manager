// riskCard — Tarjeta de riesgo: enlace de las listas de chequeo con el nivel de
// riesgo (FRAT). Lógica pura, con tests (regla Q2). Cada paso de una lista puede
// tener un peso; una respuesta "no" en ese paso suma su peso al puntaje total, y
// el total cae en una zona de tolerabilidad según dos umbrales configurados por
// la organización. El servidor RE-EVALÚA con esto antes de despachar; nunca se
// confía en el puntaje que diga el navegador.

// El valor de respuesta que suma el peso (una deficiencia: el paso se respondió "no").
export const RISK_CARD_TRIGGER = 'no';

/**
 * Puntaje de la tarjeta de riesgo a partir de las respuestas de las listas.
 * @param {object} i
 *  - weights: [{ checklist_id, position, weight }]  pesos configurados (>0)
 *  - answers: { [checklistId]: [{ value }] }         respuestas del piloto
 *  - tolerableThreshold / inaceptableThreshold: enteros ≥ 0, o null si no se configuró
 * @returns {{ configured, total, zone, maxTotal, triggered }}
 *   zone ∈ 'aceptable' | 'tolerable' | 'inaceptable' (null si no está configurado)
 */
export function scoreRiskCard({ weights, answers, tolerableThreshold, inaceptableThreshold } = {}) {
  const list = Array.isArray(weights) ? weights : [];
  const maxTotal = list.reduce((acc, w) => acc + (Number(w?.weight) > 0 ? Number(w.weight) : 0), 0);

  const configured =
    list.length > 0 &&
    Number.isInteger(tolerableThreshold) &&
    Number.isInteger(inaceptableThreshold) &&
    tolerableThreshold >= 0 &&
    inaceptableThreshold > tolerableThreshold;

  let total = 0;
  const triggered = [];
  for (const w of list) {
    const weight = Number(w?.weight);
    if (!(weight > 0)) continue;
    const given = answers?.[w.checklist_id] || [];
    const a = given[w.position];
    if (a && a.value === RISK_CARD_TRIGGER) {
      total += weight;
      triggered.push({ checklist_id: w.checklist_id, position: w.position, weight });
    }
  }

  let zone = null;
  if (configured) {
    if (total >= inaceptableThreshold) zone = 'inaceptable';
    else if (total >= tolerableThreshold) zone = 'tolerable';
    else zone = 'aceptable';
  }

  return { configured, total, zone, maxTotal, triggered };
}
