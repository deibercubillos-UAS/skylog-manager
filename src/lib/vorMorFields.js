/**
 * vorMorFields.js
 *
 * Campos BASE de los formularios VOR y MOR.
 * Estos campos NUNCA se almacenan en Supabase — viven en código.
 * La DB solo guarda los DELTAS (overrides) del cliente: { hidden, label, required, placeholder }.
 *
 * Estructura de vor_mor_definitions.custom_fields (JSONB):
 * {
 *   base_overrides: {
 *     "description": { label: "¿Qué ocurrió?", required: true },
 *     "reporter_name": { hidden: true },
 *   },
 *   custom: [
 *     { id: "uuid", label: "...", type: "text", required: false, placeholder: "...", options: [] }
 *   ]
 * }
 *
 * Si custom_fields es un array [] (formato antiguo) se trata como { base_overrides: {}, custom: [] }.
 */

// ─────────────────────────────────────────────────────────────────────────────
//  Definición canónica de los campos base
// ─────────────────────────────────────────────────────────────────────────────
export const BASE_FIELDS = [
  // ── Datos del reportante ──
  {
    id:          'reporter_name',
    label:       'Nombre del reportante',
    placeholder: 'Dejar en blanco para enviar anónimamente',
    type:        'text',
    required:    false,
    section:     'reporter',
    hideable:    true,   // el cliente puede ocultar este campo
    removable:   false,  // descripción de negocio, no se puede ocultar la sección
  },
  {
    id:          'reporter_email',
    label:       'Correo electrónico',
    placeholder: 'Para recibir actualizaciones (opcional)',
    type:        'email',
    required:    false,
    section:     'reporter',
    hideable:    true,
  },
  // ── Datos de la ocurrencia ──
  {
    id:          'occurrence_date',
    label:       'Fecha del evento',
    placeholder: '',
    type:        'date',
    required:    false,
    section:     'occurrence',
    hideable:    true,
  },
  {
    id:          'occurrence_time',
    label:       'Hora del evento',
    placeholder: '',
    type:        'time',
    required:    false,
    section:     'occurrence',
    hideable:    true,
  },
  {
    id:          'location',
    label:       'Lugar / Ubicación',
    placeholder: 'Ciudad, coordenadas o descripción del lugar',
    type:        'text',
    required:    false,
    section:     'occurrence',
    hideable:    true,
  },
  // ── Descripción del evento (no ocultable — núcleo del reporte) ──
  {
    id:          'description',
    label:       'Descripción del evento',
    placeholder: 'Describe detalladamente lo que ocurrió...',
    type:        'textarea',
    required:    true,
    section:     'event',
    hideable:    false,   // SIEMPRE visible — es el campo central del reporte
  },
  {
    id:          'immediate_actions',
    label:       'Acciones inmediatas tomadas',
    placeholder: '¿Qué medidas se tomaron en el momento?',
    type:        'textarea',
    required:    false,
    section:     'event',
    hideable:    true,
  },
  {
    id:          'contributing_factors',
    label:       'Factores contribuyentes',
    placeholder: 'Condiciones, factores humanos, técnicos u organizacionales...',
    type:        'textarea',
    required:    false,
    section:     'event',
    hideable:    true,
  },
  // ── Seguridad (autoevaluación del reportante) ──
  {
    id:          'reported_severity',
    label:       'Severidad percibida',
    placeholder: '',
    type:        'select',
    required:    true,
    section:     'safety',
    hideable:    true,
    // Mismo vocabulario RAC 100 que la clasificación oficial que asigna el equipo SMS
    // (vor_mor_submissions.severity) — se guarda en una columna separada
    // (reported_severity) porque es la percepción del reportante, no la clasificación
    // regulatoria final.
    options: [
      { value: 'incidente',       label: 'Incidente' },
      { value: 'incidente_grave', label: 'Incidente grave' },
      { value: 'accidente',       label: 'Accidente' },
    ],
  },
  {
    id:          'related_barrier_id',
    label:       'Barrera de seguridad relacionada',
    placeholder: '',
    // Tipo especial: el listado de opciones no es estático, se resuelve en tiempo real
    // contra las barreras activas de la organización (safety_barriers) — ver VorMorForm.js
    type:        'barrier_select',
    required:    false,
    section:     'safety',
    hideable:    true,
  },
];

export const SECTION_LABELS = {
  reporter:   'Datos del reportante (opcionales)',
  occurrence: 'Datos de la ocurrencia',
  event:      'Descripción del evento',
  safety:     'Seguridad',
};

// ─────────────────────────────────────────────────────────────────────────────
//  Parsear custom_fields desde DB (maneja formato viejo [] y nuevo {})
// ─────────────────────────────────────────────────────────────────────────────
export function parseFormConfig(raw) {
  if (!raw) return { base_overrides: {}, custom: [] };
  // Formato antiguo: array plano de custom fields
  if (Array.isArray(raw)) return { base_overrides: {}, custom: raw };
  // Formato nuevo
  return {
    base_overrides: raw.base_overrides || {},
    custom:         raw.custom         || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Resolver campos base aplicando overrides del cliente
//  Retorna los campos que deben mostrarse en el formulario público
// ─────────────────────────────────────────────────────────────────────────────
export function resolveFields(formConfig) {
  const { base_overrides, custom } = parseFormConfig(formConfig);

  const resolvedBase = BASE_FIELDS
    .map(field => {
      const ov = base_overrides[field.id] || {};
      return {
        ...field,
        label:       ov.label       ?? field.label,
        placeholder: ov.placeholder ?? field.placeholder,
        required:    ov.required    ?? field.required,
        hidden:      field.hideable ? (ov.hidden ?? false) : false,
        isBase:      true,
      };
    })
    .filter(f => !f.hidden);

  const resolvedCustom = (custom || []).map(f => ({ ...f, isBase: false }));

  return [...resolvedBase, ...resolvedCustom];
}

// ─────────────────────────────────────────────────────────────────────────────
//  Calcular tamaño estimado del JSON a guardar (para info al usuario)
// ─────────────────────────────────────────────────────────────────────────────
export function estimateConfigBytes(config) {
  return new Blob([JSON.stringify(config)]).size;
}
