// Colombia es UTC-5 todo el año (sin horario de verano) — seguro fijarlo.
const COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;

// Instante UTC real que corresponde a las 00:00 del día actual en Colombia
// (no medianoche UTC — importante entre ~19:00 y 23:59 Colombia, donde UTC
// ya cambió de día calendario pero Colombia no).
export function colombiaStartOfDay(reference = new Date()) {
  const shifted = new Date(reference.getTime() - COLOMBIA_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() + COLOMBIA_OFFSET_MS);
}

export function colombiaEndOfDay(reference = new Date()) {
  const start = colombiaStartOfDay(reference);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}
