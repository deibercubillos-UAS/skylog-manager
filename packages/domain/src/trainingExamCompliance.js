// trainingExamCompliance — cumplimiento del examen calificado de
// capacitación, por ciclo recurrente (misma vocabulario/ventanas de N días
// que smsTrainingSchedule.js — semanal/quincenal/mensual/personalizado).
// Lógica pura, con tests (regla Q2). A pedido del usuario: área de
// capacitación y examen completa, propia, distinta del cronograma SMS de
// asistencia (que no califica ni bloquea).

import { cycleLengthDays } from './smsTrainingSchedule.js';

/**
 * Inicio del ciclo vigente (ventana de N días desde `startDate`) que contiene
 * `asOf`. Mismo criterio que occurrencesInRange/nextOccurrence.
 */
export function currentCycleStart(exam, asOf = new Date()) {
  const days = cycleLengthDays(exam.recurrence, exam.recurrenceDays);
  const start = new Date(exam.startDate);
  if (asOf < start) return start.toISOString().slice(0, 10);
  const msPerCycle = days * 86_400_000;
  const cyclesElapsed = Math.floor((asOf - start) / msPerCycle);
  return new Date(start.getTime() + cyclesElapsed * msPerCycle).toISOString().slice(0, 10);
}

export function cycleDeadline(exam, cycleStartDate) {
  const days = cycleLengthDays(exam.recurrence, exam.recurrenceDays);
  return new Date(new Date(cycleStartDate).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Estado de cumplimiento de una persona frente a un examen, evaluando sus
 * intentos del ciclo vigente:
 *  - not_configured: no hay examen configurado — nunca bloquea.
 *  - ok: ya aprobó el ciclo vigente.
 *  - pending: dentro del ciclo vigente, con intentos disponibles, sin aprobar.
 *  - failed: agotó los intentos del ciclo vigente sin aprobar.
 * `compliant` es true para ok/pending/not_configured — false para failed.
 *
 * Nota de diseño: NO existe un estado `overdue` separado — `currentCycleStart()`
 * siempre devuelve el ciclo que CONTIENE `asOf` (ciclos rotativos, sin huecos),
 * así que el plazo del ciclo vigente nunca ya venció por definición. Un ciclo
 * no resuelto simplemente termina y el siguiente arranca con intentos frescos
 * — `failed` ya captura "sin aprobar y sin intentos", que es la condición real
 * que debe bloquear el despacho, no una fecha de vencimiento aparte.
 */
export function computeExamCompliance(exam, attempts, asOf = new Date()) {
  if (!exam) return { status: 'not_configured', compliant: true, attemptsUsed: 0, attemptsRemaining: null };

  const cycleStart = currentCycleStart(exam, asOf);
  const deadline = cycleDeadline(exam, cycleStart);
  const cycleAttempts = (attempts || []).filter((a) => a.cycleStart === cycleStart);
  const passed = cycleAttempts.some((a) => a.passed);
  const attemptsUsed = cycleAttempts.length;
  const attemptsRemaining = Math.max(0, exam.maxAttempts - attemptsUsed);

  if (passed) return { status: 'ok', compliant: true, cycleStart, deadline, attemptsUsed, attemptsRemaining };
  if (attemptsRemaining <= 0) return { status: 'failed', compliant: false, cycleStart, deadline, attemptsUsed, attemptsRemaining };
  return { status: 'pending', compliant: true, cycleStart, deadline, attemptsUsed, attemptsRemaining };
}

/** Califica un intento — nunca se confía en un `score`/`passed` mandado por el cliente. */
export function gradeAttempt(questions, answers, passingScore) {
  const total = questions.length;
  if (total === 0) return { score: 0, passed: false, correctCount: 0, total: 0 };
  const correctCount = questions.reduce((count, q, i) => (answers[i] === q.correctIndex ? count + 1 : count), 0);
  const score = (correctCount / total) * 100;
  return { score, passed: score >= passingScore, correctCount, total };
}
