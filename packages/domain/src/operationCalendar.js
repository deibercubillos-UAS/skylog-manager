// operationCalendar — "día" y "mes calendario" en la zona de la operación.
//
// RAC 100 §100.540 habla de **mes calendario** en (c)(1) y de ventanas de 24h
// en (d)(1). Ambos son conceptos locales del explotador, no UTC. Hasta la
// auditoría del 2026-10-02 estas dos claves se calculaban con
// `getUTC*`/`toISOString()` en **5 copias idénticas** (4 rutas de API + una
// privada en `dutyCompliance.js`), lo que ponía la frontera del día a las
// 19:00 de Colombia:
//
//   · Un piloto podía volar 8h hasta las 19:00 y 8h más después — contadas
//     como dos días distintos, 16h en un mismo día local, pasando el chequeo
//     de (d)(1) sin novedad.
//   · Un vuelo del 30-sep a las 19:00 local contaba en el cupo mensual de
//     octubre.
//
// Vive en el dominio (y no en cada ruta) precisamente porque estaba duplicado:
// arreglar la zona en un sitio y no en los otros haría que el chequeo de
// despacho y el resumen del gestor discrepen sobre qué día es hoy.

// Colombia es UTC-5 todo el año (sin horario de verano), pero se resuelve con
// Intl y no con un offset fijo para que llevar el producto a otro país sea
// cambiar este valor y nada más.
export const OPERATION_TIME_ZONE = 'America/Bogota';

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

const formatters = new Map();

function calendarParts(dateLike, timeZone) {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timeZone, fmt);
  }
  // formatToParts y no format(): el orden de los campos depende del locale,
  // armar la cadena a mano la vuelve independiente de eso.
  const parts = fmt.formatToParts(new Date(dateLike));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Día calendario de la operación, 'YYYY-MM-DD'.
 *
 * Una cadena 'YYYY-MM-DD' ya ES una fecha calendario, no un instante, así que
 * se devuelve tal cual: convertirla de zona la correría un día, porque el
 * parser de JS la lee como medianoche UTC y en Bogotá eso es el día anterior.
 * Un `timestamptz` (`takeoff_at`, `started_at`) sí es un instante y se
 * traduce a la zona de la operación.
 */
export function dayKey(dateLike, timeZone = OPERATION_TIME_ZONE) {
  if (typeof dateLike === 'string' && BARE_DATE.test(dateLike)) return dateLike;
  const { year, month, day } = calendarParts(dateLike, timeZone);
  return `${year}-${month}-${day}`;
}

/** Mes calendario de la operación, 'YYYY-MM'. Misma regla que `dayKey`. */
export function monthKey(dateLike, timeZone = OPERATION_TIME_ZONE) {
  return dayKey(dateLike, timeZone).slice(0, 7);
}
