// onboardingImport — carga inicial por Excel («Onboarding Express»): definición de las hojas de la plantilla y lectura
// validada de cada fila. Lógica pura (sin Excel ni Supabase): el servidor lee el archivo, pasa las filas aquí y aplica
// lo que salga limpio. Cada fila trae su número real de fila del archivo para poder decirle al usuario dónde falló.
import { INVITE_ROLES } from './invitations.js';
import { POLICY_TYPES } from './insuranceCoverage.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const HEALTH_VALUES = ['buena', 'regular', 'mala'];

/** Hojas de la plantilla: nombre visible, columnas (clave interna, encabezado, obligatoria) y una fila de ejemplo. */
export const ONBOARDING_SHEETS = [
  {
    key: 'aeronaves', name: 'Aeronaves', hint: 'Una fila por dron. Si la marca y el modelo no existen, se crean.',
    columns: [
      { key: 'brand', header: 'Marca', required: true }, { key: 'model', header: 'Modelo', required: true },
      { key: 'serial', header: 'N.º de serie', required: true }, { key: 'ruas', header: 'N.º RUAS' }, { key: 'hours', header: 'Horas totales' },
    ],
    example: ['Ejemplo: DJI', 'Matrice 350 RTK', 'SN-0001', 'RUAS-123', 12.5],
  },
  {
    key: 'baterias', name: 'Baterías', hint: 'Una fila por batería. Estado de salud: buena, regular o mala.',
    columns: [
      { key: 'serial', header: 'N.º de serie', required: true }, { key: 'brand', header: 'Marca' }, { key: 'model', header: 'Modelo' },
      { key: 'cycles', header: 'Ciclos' }, { key: 'health', header: 'Estado de salud' },
    ],
    example: ['Ejemplo: TB65-001', 'DJI', 'TB65', 40, 'buena'],
  },
  {
    key: 'tripulacion', name: 'Tripulación', hint: 'Cada persona recibe una invitación por correo. Rol: piloto, jefe de pilotos, gerente SMS o gerente general.',
    columns: [{ key: 'name', header: 'Nombre completo' }, { key: 'email', header: 'Correo', required: true }, { key: 'role', header: 'Rol', required: true }],
    example: ['Ejemplo: Ana Pérez', 'ana@empresa.com', 'piloto'],
  },
  {
    key: 'contactos', name: 'Contactos de emergencia', hint: 'Personas a quienes llamar en una emergencia.',
    columns: [
      { key: 'name', header: 'Nombre', required: true }, { key: 'role', header: 'Cargo' }, { key: 'phone', header: 'Teléfono' },
      { key: 'email', header: 'Correo' }, { key: 'notes', header: 'Notas' },
    ],
    example: ['Ejemplo: Torre de control', 'Aeropuerto', '3001234567', '', ''],
  },
  {
    key: 'polizas', name: 'Pólizas', hint: 'Fechas en formato AAAA-MM-DD o DD/MM/AAAA. Tipo: rce, casco u otra.',
    columns: [
      { key: 'type', header: 'Tipo' }, { key: 'insurer', header: 'Aseguradora', required: true }, { key: 'number', header: 'N.º de póliza', required: true },
      { key: 'start', header: 'Inicio', required: true }, { key: 'end', header: 'Fin', required: true }, { key: 'amount', header: 'Valor asegurado (COP)' },
    ],
    example: ['Ejemplo: rce', 'Aseguradora X', 'POL-001', '2026-01-01', '2026-12-31', 500000000],
  },
];

const strip = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[*()]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const cell = (v) => {
  if (v == null) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'object') return String(v.text ?? v.result ?? '').trim(); // celdas con hipervínculo o fórmula
  return typeof v === 'string' ? v.trim() : v;
};

/** Encabezado del archivo → clave interna de la columna (ignora tildes, mayúsculas y el « *» de obligatoria). */
export function headerKey(sheet, header) {
  const h = strip(header);
  const col = sheet.columns.find((c) => strip(c.header) === h);
  return col ? col.key : null;
}

export function parseDate(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return validYmd(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return validYmd(m[3], m[2].padStart(2, '0'), m[1].padStart(2, '0'));
  return null;
}
function validYmd(y, mo, d) {
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return dt.getUTCFullYear() === Number(y) && dt.getUTCMonth() === Number(mo) - 1 && dt.getUTCDate() === Number(d) ? `${y}-${mo}-${d}` : null;
}

function num(v, { integer = false, label }) {
  if (v === '' || v == null) return { value: null };
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return { error: `${label} debe ser un número de 0 en adelante.` };
  if (integer && !Number.isInteger(n)) return { error: `${label} debe ser un número entero.` };
  return { value: n };
}

export function roleFromLabel(v) {
  const s = strip(v).replace(/ /g, '_');
  const map = { piloto: 'piloto', jefe_de_pilotos: 'jefe_pilotos', jefe_pilotos: 'jefe_pilotos', gerente_sms: 'gerente_sms', gerente_general: 'admin', admin: 'admin' };
  const r = map[s];
  return r && INVITE_ROLES.includes(r) ? r : null;
}

const ROW_PARSERS = {
  aeronaves(r) {
    const e = [];
    if (!r.brand) e.push('Falta la marca.'); if (!r.model) e.push('Falta el modelo.'); if (!r.serial) e.push('Falta el n.º de serie.');
    const h = num(r.hours, { label: 'Las horas totales' }); if (h.error) e.push(h.error);
    return { errors: e, item: { brand: String(r.brand || ''), model: String(r.model || ''), serial: String(r.serial || ''), ruas: String(r.ruas || '') || null, hours: h.value ?? 0 } };
  },
  baterias(r) {
    const e = [];
    if (!r.serial) e.push('Falta el n.º de serie.');
    const c = num(r.cycles, { integer: true, label: 'Los ciclos' }); if (c.error) e.push(c.error);
    const health = strip(r.health);
    if (health && !HEALTH_VALUES.includes(health)) e.push('Estado de salud: buena, regular o mala.');
    return { errors: e, item: { serial: String(r.serial || ''), brand: String(r.brand || '') || null, model: String(r.model || '') || null, cycles: c.value ?? 0, health: health || null } };
  },
  tripulacion(r) {
    const e = [];
    const email = String(r.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) e.push('Escribe un correo válido.');
    const role = roleFromLabel(r.role);
    if (!role) e.push('Rol no válido (piloto, jefe de pilotos, gerente SMS o gerente general).');
    return { errors: e, item: { name: String(r.name || '').trim() || null, email, role } };
  },
  contactos(r) {
    const e = [];
    if (!r.name) e.push('Falta el nombre.');
    const email = String(r.email || '').trim();
    if (email && !EMAIL_RE.test(email)) e.push('El correo no es válido.');
    if (!r.phone && !email) e.push('Escribe un teléfono o un correo de contacto.');
    return { errors: e, item: { name: String(r.name || ''), role: String(r.role || '') || null, phone: String(r.phone || '') || null, email: email || null, notes: String(r.notes || '') || null } };
  },
  polizas(r) {
    const e = [];
    const type = strip(r.type) || 'rce';
    if (!POLICY_TYPES.includes(type)) e.push('Tipo de póliza: rce, casco u otra.');
    if (!r.insurer) e.push('Falta la aseguradora.'); if (!r.number) e.push('Falta el n.º de póliza.');
    const start = parseDate(r.start); const end = parseDate(r.end);
    if (!start) e.push('Fecha de inicio no válida.'); if (!end) e.push('Fecha de fin no válida.');
    if (start && end && start > end) e.push('La fecha de fin es anterior a la de inicio.');
    const a = num(r.amount, { label: 'El valor asegurado' }); if (a.error) e.push(a.error);
    return { errors: e, item: { type, insurer: String(r.insurer || ''), number: String(r.number || ''), start, end, amount: a.value } };
  },
};

/**
 * @param {string} sheetKey clave de ONBOARDING_SHEETS
 * @param {Record<string, unknown>[]} rawRows filas como objetos { encabezado: valor }, en el orden del archivo (la primera es la fila 2)
 * @returns {{ items: object[], errors: {row:number, message:string}[], skipped: number }}
 */
export function parseOnboardingSheet(sheetKey, rawRows) {
  const sheet = ONBOARDING_SHEETS.find((s) => s.key === sheetKey);
  if (!sheet) throw new Error(`Hoja desconocida: ${sheetKey}`);
  const items = [];
  const errors = [];
  let skipped = 0;
  (rawRows || []).forEach((raw, i) => {
    const rowNumber = i + 2;
    const r = {};
    for (const [header, value] of Object.entries(raw || {})) {
      const k = headerKey(sheet, header);
      if (k) r[k] = cell(value);
    }
    const values = Object.values(r).filter((v) => v !== '' && v != null);
    const first = String(values[0] ?? '');
    if (values.length === 0 || /^ejemplo\b/i.test(first)) { skipped += 1; return; }
    const { errors: rowErrors, item } = ROW_PARSERS[sheetKey](r);
    if (rowErrors.length) rowErrors.forEach((message) => errors.push({ row: rowNumber, message }));
    else items.push({ row: rowNumber, ...item });
  });
  return { items, errors, skipped };
}

/** Marca como duplicadas (dentro del propio archivo) las filas que repiten la clave natural; la primera gana. */
export function dedupeInFile(items, keyFn) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) duplicates.push(it); else { seen.add(k); unique.push(it); }
  }
  return { unique, duplicates };
}
