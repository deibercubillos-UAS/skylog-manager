// smsReportForms — formularios MOR/VOR configurables (docs/skylog-v2/40b-sms-formularios-mor-vor.md).
// Lógica pura, con tests (regla Q2). El servidor y la interfaz comparten esto para renderizar y validar.
//
// La organización puede, por tipo (MOR y VOR por separado): ocultar/obligar/ordenar/renombrar los campos
// ESTÁNDAR y agregar PREGUNTAS PROPIAS. Dos campos son el mínimo regulatorio y quedan BLOQUEADOS (no se
// ocultan ni se vuelven opcionales): descripción y severidad (§2 de la directiva MAUT).
import { REPORT_SEVERITY_LEVELS } from './smsReporting.js';
import { validateReportInput } from './smsTracking.js';

export const REPORT_FORM_TYPES = ['mor', 'vor'];
export const CUSTOM_INPUT_TYPES = ['text', 'textarea', 'select', 'date', 'number', 'boolean'];

// Campos estándar del formulario, en su orden por defecto. `input_type` compatible con el CHECK de la tabla;
// la interfaz igual renderiza cada estándar por su `key` (evento = lista UAS, aeronave/vuelo = selección de
// flota, occurred_at = fecha y hora). `locked`: mínimo regulatorio → siempre visible y obligatorio.
export const STANDARD_REPORT_FIELDS = [
  { key: 'event', label: 'Tipo de suceso', input_type: 'select', locked: false, defaultRequired: false },
  { key: 'severity', label: 'Severidad', input_type: 'select', locked: true, defaultRequired: true },
  { key: 'occurred_at', label: 'Fecha y hora del suceso', input_type: 'date', locked: false, defaultRequired: false },
  { key: 'location', label: 'Lugar', input_type: 'text', locked: false, defaultRequired: false },
  { key: 'aircraft', label: 'Aeronave', input_type: 'select', locked: false, defaultRequired: false },
  { key: 'flight', label: 'Vuelo relacionado', input_type: 'select', locked: false, defaultRequired: false },
  { key: 'description', label: 'Descripción del suceso', input_type: 'textarea', locked: true, defaultRequired: true },
  { key: 'confidential', label: 'Tratar como confidencial', input_type: 'boolean', locked: false, defaultRequired: false },
];

const STANDARD_BY_KEY = new Map(STANDARD_REPORT_FIELDS.map((f) => [f.key, f]));
export const MAX_CUSTOM_TEXT_LENGTH = 2000;

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

/**
 * Definición EFECTIVA del formulario de un tipo: fusiona las filas guardadas sobre el catálogo estándar
 * (así un estándar sin fila guardada aparece igual) y añade las preguntas propias. Fuerza los bloqueados a
 * visible+obligatorio. Devuelve la lista ordenada por `sort_order`. `storedRows`: filas de
 * sms_report_form_fields de esa organización y tipo.
 */
export function effectiveFormFields(type, storedRows = []) {
  const byKey = new Map();
  for (const r of storedRows) if (r.kind === 'standard' && r.field_key) byKey.set(r.field_key, r);

  const standard = STANDARD_REPORT_FIELDS.map((d, i) => {
    const s = byKey.get(d.key) || {};
    return {
      id: s.id ?? null,
      kind: 'standard',
      field_key: d.key,
      label: s.label ?? d.label,
      input_type: d.input_type,
      options: Array.isArray(d.options) ? d.options : [],
      locked: d.locked,
      required: d.locked ? true : (s.required ?? d.defaultRequired),
      visible: d.locked ? true : (s.visible ?? true),
      sort_order: s.sort_order ?? i,
    };
  });

  const custom = storedRows
    .filter((r) => r.kind === 'custom')
    .map((r) => ({
      id: r.id,
      kind: 'custom',
      field_key: null,
      label: r.label,
      input_type: CUSTOM_INPUT_TYPES.includes(r.input_type) ? r.input_type : 'text',
      options: Array.isArray(r.options) ? r.options : [],
      locked: false,
      required: !!r.required,
      visible: r.visible !== false,
      sort_order: r.sort_order ?? 999,
    }));

  return [...standard, ...custom].sort((a, b) => a.sort_order - b.sort_order);
}

/** Filas estándar por defecto para SEMBRAR un tipo (sin `id`, con `report_type`). */
export function defaultFormFields(type) {
  return effectiveFormFields(type, [])
    .filter((f) => f.kind === 'standard')
    .map(({ field_key, label, input_type, options, required, visible, locked, sort_order }) => ({
      report_type: type,
      kind: 'standard',
      field_key,
      label,
      input_type,
      options,
      required,
      visible,
      locked,
      sort_order,
    }));
}

/**
 * Valida las respuestas a las PREGUNTAS PROPIAS visibles contra su definición y las normaliza para guardar.
 * `values`: objeto { [field.id]: valor }. Devuelve { ok, errors, normalized } — `normalized` solo con las
 * preguntas visibles contestadas (lo que va a sms_reports.custom_fields).
 */
export function validateCustomValues(fieldDefs, values = {}) {
  const errors = [];
  const normalized = {};
  for (const f of fieldDefs || []) {
    if (f.kind !== 'custom' || !f.visible) continue;
    const raw = values?.[f.id];
    if (isEmpty(raw)) {
      if (f.required) errors.push(`"${f.label}" es obligatorio.`);
      continue;
    }
    switch (f.input_type) {
      case 'number': {
        const n = Number(raw);
        if (!Number.isFinite(n)) { errors.push(`"${f.label}" debe ser un número.`); break; }
        normalized[f.id] = n;
        break;
      }
      case 'boolean':
        normalized[f.id] = raw === true || raw === 'true' || raw === 'on' || raw === 1;
        break;
      case 'select': {
        const opts = Array.isArray(f.options) ? f.options : [];
        if (!opts.includes(raw)) { errors.push(`"${f.label}": opción no válida.`); break; }
        normalized[f.id] = raw;
        break;
      }
      case 'date': {
        if (Number.isNaN(Date.parse(raw))) { errors.push(`"${f.label}": fecha no válida.`); break; }
        normalized[f.id] = raw;
        break;
      }
      default: {
        const s = String(raw);
        if (s.length > MAX_CUSTOM_TEXT_LENGTH) { errors.push(`"${f.label}" es demasiado largo (máximo ${MAX_CUSTOM_TEXT_LENGTH} caracteres).`); break; }
        normalized[f.id] = s.trim();
      }
    }
  }
  return { ok: errors.length === 0, errors, normalized };
}

/**
 * Valida un envío completo contra la definición efectiva: campos estándar visibles+obligatorios presentes,
 * reglas base de descripción/severidad/fecha (reutiliza validateReportInput) y las preguntas propias.
 * `standardValues`: { [field_key]: valor } · `customValues`: { [field.id]: valor }.
 */
export function validateReportFormSubmission({ fieldDefs, standardValues = {}, customValues = {}, now, severities = REPORT_SEVERITY_LEVELS }) {
  const errors = [];
  for (const f of fieldDefs || []) {
    if (f.kind !== 'standard' || !f.visible || !f.required) continue;
    if (f.field_key === 'description' || f.field_key === 'severity') continue; // los cubre validateReportInput
    if (isEmpty(standardValues[f.field_key])) errors.push(`"${f.label}" es obligatorio.`);
  }
  const base = validateReportInput({
    description: standardValues.description,
    occurredAt: standardValues.occurred_at,
    now,
    severity: standardValues.severity,
    severities,
  });
  errors.push(...base.errors);
  const custom = validateCustomValues(fieldDefs, customValues);
  errors.push(...custom.errors);
  return { ok: errors.length === 0, errors, customFields: custom.normalized };
}

/**
 * Ruta de un reporte cuando el ENLACE define el tipo (dos enlaces públicos). Un suceso grave sigue yendo por
 * RAC 114 pase lo que pase (seguridad). Un MOR por enlace conserva la compuerta de análisis del Gerente SMS
 * (no se salta §2.1). `linkType` ∈ {'mor','vor'}.
 */
export function routeForPublicLink({ linkType, severity }) {
  if (!REPORT_SEVERITY_LEVELS.includes(severity)) {
    throw new Error(`Severidad inválida: ${severity} — debe ser una de ${REPORT_SEVERITY_LEVELS.join('/')}`);
  }
  if (severity === 'accidente' || severity === 'incidente_grave') {
    return { route: 'rac114', requiresManagerAnalysis: false, canSubmit: false };
  }
  if (linkType === 'mor') {
    return { route: 'mor', requiresManagerAnalysis: true, canSubmit: true };
  }
  return { route: 'vor', requiresManagerAnalysis: false, canSubmit: true };
}
