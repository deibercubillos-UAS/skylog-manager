const DAY_CODE_TO_INDEX = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

// A partir de "weekly:MO" o "monthly:5", calcula la próxima fecha después de
// fromDate. Se usa al completar una tarea recurrente para crear la siguiente.
export function computeNextOccurrence(recurrence, fromDate) {
  if (!recurrence) return null;
  const base = fromDate ? new Date(fromDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  const weeklyMatch = recurrence.match(/^weekly:(SU|MO|TU|WE|TH|FR|SA)$/);
  if (weeklyMatch) {
    const targetDow = DAY_CODE_TO_INDEX[weeklyMatch[1]];
    const next = new Date(base);
    next.setHours(0, 0, 0, 0);
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() !== targetDow);
    return next;
  }

  const monthlyMatch = recurrence.match(/^monthly:(\d{1,2})$/);
  if (monthlyMatch) {
    // Limitado a 28 para evitar desbordes de mes (ej. 31 de febrero).
    const day = Math.min(28, Number(monthlyMatch[1]));
    return new Date(base.getFullYear(), base.getMonth() + 1, day);
  }

  return null;
}
