// Helpers de formato compartidos — fechas y moneda.
// Importar desde aquí en vez de duplicar en cada archivo.

const LOCALE = 'es-CO';

// "13/06/2026" — tablas UI y PDFs
export function fmtDateShort(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return String(d).slice(0, 10);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

// "13/06/2026" locale — documentos Word (toLocaleDateString produce el mismo DD/MM/YYYY)
export function fmtDateNumeric(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// "13 de junio de 2026" — encabezados de documentos Word
export function fmtDateLong(d = new Date()) {
  if (typeof d === 'string') d = new Date(d);
  return d.toLocaleDateString(LOCALE, { day: '2-digit', month: 'long', year: 'numeric' });
}

// "13 jun. 2026" — tablas con espacio reducido
export function fmtDateMed(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}

// "13 jun. 2026 10:30" — timestamps de actividad
export function fmtDateTimeMed(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString(LOCALE, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// "$150.000" — precios en pesos colombianos
// opts.free: devuelve 'Gratis' en lugar de '$0' cuando n es falsy
export function fmtCOP(n, { free = false } = {}) {
  if (!n) return free ? 'Gratis' : '$0';
  return '$' + Math.round(n).toLocaleString(LOCALE);
}
