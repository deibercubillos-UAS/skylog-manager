// flightLimits — ¿este vuelo, sumado a los recientes del piloto, excede un límite de horas de vuelo
// de RAC 100 §100.540? Lógica pura, con tests (regla Q2). La usan el cierre de vuelo del Despacho y
// el registro/importación de vuelos de la Bitácora, para que ambos digan LO MISMO.
//
// Un vuelo que YA ocurrió siempre se registra: exceder un límite es un hecho que debe quedar en el
// libro de vuelo, no una razón para borrarlo del registro. Por eso esta función solo AVISA; quien
// llama decide qué hacer con el aviso (nunca rechazar el vuelo). Lo que sí bloquea es INICIAR
// servicio o despachar cuando el piloto ya está en el límite (lib/v2/serviceGates.js).
import { checkMonthlyFlightHours, checkDailyFlightHours } from './dutyCompliance.js';
import { dayKey, monthKey } from './operationCalendar.js';

const fmt = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');

/**
 * @param {Array<{pilot_person_id, takeoff_at, total_time}>} recentFlights filas de `flights` del piloto
 *   (los últimos ~32 días) SIN incluir el vuelo que se va a registrar.
 * @param {{personId: string, takeoffAt: string, totalTime: number, lineOfSight?: string}} candidate
 * @returns {{ exceeded: boolean, warnings: string[], monthly: object, daily: object }}
 */
export function evaluateFlightLimits(recentFlights, { personId, takeoffAt, totalTime, lineOfSight }) {
  const takeoff = new Date(takeoffAt);
  const projected = [
    ...(recentFlights || []).map((f) => ({ personId, date: f.takeoff_at, totalTimeHours: Number(f.total_time) })),
    { personId, date: takeoffAt, totalTimeHours: Number(totalTime) },
  ];

  const monthly = checkMonthlyFlightHours(projected, { personId, month: monthKey(takeoff) });
  const daily = checkDailyFlightHours(projected, { personId, day: dayKey(takeoff), lineOfSight: lineOfSight || 'VLOS' });

  const warnings = [];
  if (!monthly.compliant) warnings.push(`Con este vuelo se excede el límite mensual de horas de vuelo (§${monthly.rule}): ${fmt(monthly.hours)} h de ${fmt(monthly.limit)} h.`);
  if (!daily.compliant) warnings.push(`Con este vuelo se excede el límite diario de horas de vuelo (§${daily.rule}): ${fmt(daily.hours)} h de ${fmt(daily.limit)} h.`);

  return { exceeded: warnings.length > 0, warnings, monthly, daily };
}
