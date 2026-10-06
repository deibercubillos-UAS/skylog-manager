// colombianCalendar — días hábiles de Colombia (sin sábados, domingos ni festivos). Lógica pura, con
// tests (regla Q2). Los plazos regulatorios (p. ej. el MOR: "5 días hábiles desde la ocurrencia",
// Directiva 02-24) se cuentan en días hábiles; la versión de v1 solo excluía fines de semana y por eso
// daba plazos más largos de lo real cada vez que había un festivo de por medio.
//
// Festivos: Ley 51 de 1983 ("Ley Emiliani") — los de la lista "trasladable" se mueven al lunes
// siguiente (si ya caen lunes, se quedan), los fijos no se mueven y los que dependen de la Semana
// Santa se calculan desde la fecha de Pascua. Fechas 'YYYY-MM-DD'; todo se calcula en UTC puro para que
// no dependa de la zona horaria de quien ejecuta.
//
// ⚠️ Es un cálculo, no una tabla oficial: si el Gobierno decretara un festivo extraordinario no
// aparecería aquí. Los tests fijan los 18 festivos de 2026 verificados contra el calendario.

const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d, n) => new Date(d.getTime() + n * 86_400_000);

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/** Ley Emiliani: si no es lunes, pasa al lunes siguiente. */
function nextMonday(d) {
  const dow = d.getUTCDay(); // 0 domingo … 6 sábado
  return dow === 1 ? d : addDays(d, (8 - dow) % 7);
}

const holidayCache = new Map();

/** Set de festivos de un año ('YYYY-MM-DD'). */
export function colombianHolidays(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const easter = easterSunday(year);
  const dates = [
    // Fijos
    utc(year, 1, 1), utc(year, 5, 1), utc(year, 7, 20), utc(year, 8, 7), utc(year, 12, 8), utc(year, 12, 25),
    // Semana Santa (jueves y viernes santos, no se trasladan)
    addDays(easter, -3), addDays(easter, -2),
    // Trasladables al lunes siguiente
    nextMonday(utc(year, 1, 6)), nextMonday(utc(year, 3, 19)), nextMonday(utc(year, 6, 29)),
    nextMonday(utc(year, 8, 15)), nextMonday(utc(year, 10, 12)), nextMonday(utc(year, 11, 1)), nextMonday(utc(year, 11, 11)),
    // Dependientes de Pascua, trasladados al lunes
    nextMonday(addDays(easter, 39)), // Ascensión del Señor
    nextMonday(addDays(easter, 60)), // Corpus Christi
    nextMonday(addDays(easter, 68)), // Sagrado Corazón de Jesús
  ];
  const set = new Set(dates.map(key));
  holidayCache.set(year, set);
  return set;
}

const parse = (s) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return utc(y, m, d);
};

export function isColombianHoliday(dateStr) {
  const d = parse(dateStr);
  return colombianHolidays(d.getUTCFullYear()).has(key(d));
}

/** Día hábil = lunes a viernes que no sea festivo. */
export function isBusinessDay(dateStr) {
  const dow = parse(dateStr).getUTCDay();
  return dow !== 0 && dow !== 6 && !isColombianHoliday(dateStr);
}

/**
 * Suma `n` días hábiles a una fecha. El día de partida NO cuenta: si el suceso ocurrió un lunes,
 * "5 días hábiles desde la ocurrencia" vence el lunes siguiente (salvo festivos).
 */
export function addBusinessDays(dateStr, n) {
  let d = parse(dateStr);
  let added = 0;
  while (added < n) {
    d = addDays(d, 1);
    if (isBusinessDay(key(d))) added += 1;
  }
  return key(d);
}

/**
 * Días hábiles entre dos fechas, contando el día de llegada y no el de partida.
 *  0 → es el mismo día · positivo → `toStr` está N días hábiles en el futuro ·
 *  negativo → `toStr` quedó N días hábiles atrás (p. ej. un plazo ya vencido).
 */
export function businessDaysUntil(fromStr, toStr) {
  const a = fromStr.slice(0, 10);
  const b = toStr.slice(0, 10);
  if (a === b) return 0;
  const forward = b > a; // 'YYYY-MM-DD' ordena igual como texto
  const [start, end] = forward ? [a, b] : [b, a];
  let d = parse(start);
  const last = parse(end);
  let count = 0;
  while (d < last) {
    d = addDays(d, 1);
    if (isBusinessDay(key(d))) count += 1;
  }
  return forward ? count : -count;
}
