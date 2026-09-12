// smsTrainingSchedule — proyección de fechas de un cronograma de capacitación
// SMS recurrente (40-sms.md §5.2 fase 4: "cronograma de capacitación SMS con
// asistencia registrada"). Ciclos como VENTANAS DE N DÍAS desde `startDate`
// (no meses calendario) — evita los casos borde de longitud de mes variable,
// mismo criterio ya usado en producción para el examen de capacitación de
// pilotos (lib/trainingCompliance.js). Lógica pura, con tests (regla Q2).

export const RECURRENCE_DAYS = {
  semanal: 7,
  quincenal: 15,
  mensual: 30,
};

export function cycleLengthDays(recurrence, recurrenceDays) {
  if (recurrence === 'personalizado') {
    if (!recurrenceDays || recurrenceDays <= 0) {
      throw new Error('recurrenceDays es requerido y debe ser > 0 para recurrencia personalizada');
    }
    return recurrenceDays;
  }
  const days = RECURRENCE_DAYS[recurrence];
  if (!days) throw new Error(`Recurrencia inválida: ${recurrence}`);
  return days;
}

/**
 * Todas las fechas de ocurrencia de una sesión recurrente dentro de
 * [from, to] (inclusive), en orden cronológico. `startDate`/`from`/`to` son
 * strings ISO (YYYY-MM-DD) o Date.
 */
export function occurrencesInRange(session, from, to) {
  const days = cycleLengthDays(session.recurrence, session.recurrenceDays);
  const start = new Date(session.startDate);
  const rangeFrom = new Date(from);
  const rangeTo = new Date(to);
  if (rangeTo < start) return [];

  const msPerCycle = days * 86_400_000;
  const occurrences = [];

  // Primera ocurrencia >= rangeFrom (o startDate si rangeFrom es anterior).
  let cursor = new Date(start);
  if (cursor < rangeFrom) {
    const cyclesElapsed = Math.ceil((rangeFrom - cursor) / msPerCycle);
    cursor = new Date(start.getTime() + cyclesElapsed * msPerCycle);
  }

  while (cursor <= rangeTo) {
    occurrences.push(new Date(cursor).toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + msPerCycle);
  }

  return occurrences;
}

/** Próxima ocurrencia desde `asOf` (default ahora) — null si la sesión ya no tiene futuro relevante. */
export function nextOccurrence(session, asOf = new Date()) {
  const days = cycleLengthDays(session.recurrence, session.recurrenceDays);
  const start = new Date(session.startDate);
  const msPerCycle = days * 86_400_000;
  if (asOf <= start) return start.toISOString().slice(0, 10);

  const cyclesElapsed = Math.ceil((asOf - start) / msPerCycle);
  const next = new Date(start.getTime() + cyclesElapsed * msPerCycle);
  return next.toISOString().slice(0, 10);
}
