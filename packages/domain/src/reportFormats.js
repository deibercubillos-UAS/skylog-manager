// Códigos de formato y versión de los reportes PDF — cada organización define los suyos en su
// manual de operaciones (la RAC 100 no impone códigos oficiales). Puro: sin Supabase ni React.
// Se guarda como jsonb en `organizations.report_formats`: { [reportKey]: { code, version } }.

export const REPORT_FORMAT_KEYS = ['vuelos', 'uas', 'bitacora_piloto', 'mantenimiento', 'baterias', 'tripulacion', 'capacitacion', 'proveedores_lista', 'proveedores_auditoria', 'duty', 'programacion', 'eta'];

/** Código sugerido cuando la organización no definió uno. Vacío = el PDF sale sin código. */
export const REPORT_FORMAT_DEFAULTS = {
  vuelos: 'F-OPS-002',
  uas: '',
  bitacora_piloto: '',
  mantenimiento: 'F-MNT-006',
  baterias: 'F-MNT-003',
  tripulacion: 'F-HUM-005',
  capacitacion: 'F-CAP-008',
  proveedores_lista: '',
  proveedores_auditoria: '',
  duty: '',
  programacion: 'F-OPS-001',
  eta: '',
};

export const DEFAULT_REPORT_VERSION = '1.0';
export const MAX_CODE_LENGTH = 24;
export const MAX_VERSION_LENGTH = 12;
const SAFE_TEXT = /^[A-Za-z0-9 ._/\-]*$/;

/** Código y versión efectivos de un reporte: lo guardado por la organización, o el valor por defecto. */
export function resolveReportFormat(stored, key) {
  const entry = stored && typeof stored === 'object' ? stored[key] : null;
  const hasCode = entry && typeof entry.code === 'string';
  const code = hasCode ? entry.code.trim() : REPORT_FORMAT_DEFAULTS[key] || '';
  const version = entry && typeof entry.version === 'string' && entry.version.trim() ? entry.version.trim() : DEFAULT_REPORT_VERSION;
  return { code, version };
}

/**
 * Valida lo que envía el cliente. Devuelve { ok: true, value } con solo las claves conocidas y los
 * textos recortados, o { ok: false, error } — nunca guarda texto con caracteres raros ni demasiado largo.
 */
export function sanitizeReportFormats(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Formato inválido' };
  const value = {};
  for (const [key, entry] of Object.entries(input)) {
    if (!REPORT_FORMAT_KEYS.includes(key)) return { ok: false, error: `Reporte desconocido: ${key}` };
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return { ok: false, error: `Formato inválido para ${key}` };
    const code = entry.code === undefined ? undefined : String(entry.code).trim();
    const version = entry.version === undefined ? undefined : String(entry.version).trim();
    if (code !== undefined && (code.length > MAX_CODE_LENGTH || !SAFE_TEXT.test(code))) {
      return { ok: false, error: `El código de "${key}" admite letras, números, espacios y . _ / - (máx. ${MAX_CODE_LENGTH})` };
    }
    if (version !== undefined && (version.length > MAX_VERSION_LENGTH || !SAFE_TEXT.test(version))) {
      return { ok: false, error: `La versión de "${key}" admite letras, números, espacios y . _ / - (máx. ${MAX_VERSION_LENGTH})` };
    }
    value[key] = {};
    if (code !== undefined) value[key].code = code;
    if (version !== undefined && version !== '') value[key].version = version;
  }
  return { ok: true, value };
}
