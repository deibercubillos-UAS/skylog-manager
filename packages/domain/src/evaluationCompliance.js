// evaluationCompliance — cumplimiento de una EVALUACIÓN discreta con fecha
// límite propia (`due_date`), distinto del examen recurrente por ciclos de
// `trainingExamCompliance.js` (que sigue existiendo, sin tocar, para el
// modelo legado de v1/duty-start). A pedido explícito del usuario: "podemos
// tener varios examenes a través del tiempo, por ende debo poder poner
// fechas límites de realización de la evaluación" — cada evaluación es su
// propia entidad con su propio banco de preguntas (nunca comparte "ciclos"
// con otra). Lógica pura, con tests (regla Q2).
// `gradeAttempt` (calificación server-side, sin confiar en el cliente) se
// reutiliza tal cual de `trainingExamCompliance.js` — ya exportado por
// `index.js`, no se re-exporta aquí para no crear un binding ambiguo entre
// dos `export *` con el mismo nombre.

/**
 * Estado de cumplimiento de UNA evaluación puntual:
 *  - not_configured: no hay evaluación — nunca bloquea.
 *  - ok: ya la aprobó (en cualquier momento, incluso después de la fecha límite).
 *  - pending: sin aprobar, con intentos disponibles, antes de la fecha límite.
 *  - overdue: sin aprobar, con intentos disponibles, la fecha límite ya pasó.
 *  - failed: agotó los intentos sin aprobar (independiente de la fecha límite).
 * `compliant` es true solo para ok/not_configured/pending — false para
 * overdue/failed (a diferencia del modelo por ciclos, aquí "vencido" SÍ es
 * un estado real y alcanzable, porque cada evaluación tiene una fecha límite
 * fija en vez de un ciclo rotativo sin huecos).
 */
export function computeEvaluationCompliance(evaluation, attempts, asOf = new Date()) {
  if (!evaluation) return { status: 'not_configured', compliant: true, attemptsUsed: 0, attemptsRemaining: null };

  const attemptsUsed = (attempts || []).length;
  const passed = (attempts || []).some((a) => a.passed);
  const attemptsRemaining = Math.max(0, evaluation.maxAttempts - attemptsUsed);
  const dueDateEnd = new Date(`${evaluation.dueDate}T23:59:59`);
  const isOverdue = asOf > dueDateEnd;

  if (passed) return { status: 'ok', compliant: true, attemptsUsed, attemptsRemaining, dueDate: evaluation.dueDate };
  if (attemptsRemaining <= 0) return { status: 'failed', compliant: false, attemptsUsed, attemptsRemaining, dueDate: evaluation.dueDate };
  if (isOverdue) return { status: 'overdue', compliant: false, attemptsUsed, attemptsRemaining, dueDate: evaluation.dueDate };
  return { status: 'pending', compliant: true, attemptsUsed, attemptsRemaining, dueDate: evaluation.dueDate };
}

/**
 * Reduce varias evaluaciones (de una misma pista, a través del tiempo) al
 * estado que importa AHORA para una persona: la primera, en orden
 * cronológico por `dueDate`, que todavía no aprobó — esa es la que bloquea
 * (pendiente, vencida o reprobada). Si ya aprobó todas, el resultado es `ok`
 * referenciando la más reciente. Sin evaluaciones, `not_configured`.
 */
export function personEvaluationStatus(evaluations, attemptsByEvaluationId, asOf = new Date()) {
  const sorted = [...(evaluations || [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (sorted.length === 0) return { evaluation: null, compliance: { status: 'not_configured', compliant: true, attemptsUsed: 0, attemptsRemaining: null } };

  for (const evaluation of sorted) {
    const attempts = attemptsByEvaluationId.get(evaluation.id) || [];
    const compliance = computeEvaluationCompliance(evaluation, attempts, asOf);
    if (compliance.status !== 'ok') return { evaluation, compliance };
  }

  const last = sorted[sorted.length - 1];
  return { evaluation: last, compliance: { status: 'ok', compliant: true, attemptsUsed: 0, attemptsRemaining: null, dueDate: last.dueDate } };
}
