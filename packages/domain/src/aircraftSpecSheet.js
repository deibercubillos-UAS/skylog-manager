// aircraftSpecSheet — ficha técnica del modelo de UAS (RAC 100 Apéndice 1, Parte B). Un solo catálogo de campos
// que usan la pantalla de edición, la validación del servidor y el indicador de completitud, para que no se
// desincronicen. Lógica pura, con tests (regla Q2). El peso real es de la UNIDAD (aircraft), no del modelo.

export const TAKEOFF_LANDING_TYPES = ['VTOL', 'CTOL', 'STOL', 'HTOL', 'lanzamiento', 'catapulta'];
export const AIRCRAFT_CATEGORIES = [
  { key: 'ala_fija', label: 'Ala fija' },
  { key: 'ala_rotatoria', label: 'Ala rotatoria' },
  { key: 'mixta', label: 'Mixta' },
];

// type: number | text | select | list (texto separado por comas → arreglo jsonb) | bool | c2 (objeto jsonb con C2_FIELDS).
export const SPEC_FIELDS = [
  { key: 'category', label: 'Caracterización', group: 'General', type: 'select', options: AIRCRAFT_CATEGORIES.map((c) => c.key), optionLabels: Object.fromEntries(AIRCRAFT_CATEGORIES.map((c) => [c.key, c.label])) },
  { key: 'payload_type', label: 'Tipo de carga útil', group: 'General', type: 'text' },
  { key: 'mtow_kg', label: 'Peso máximo de despegue (MTOW)', unit: 'kg', group: 'Peso y dimensiones', type: 'number' },
  { key: 'pmbo_kg', label: 'PMBO', unit: 'kg', group: 'Peso y dimensiones', type: 'number' },
  { key: 'length_m', label: 'Largo', unit: 'm', group: 'Peso y dimensiones', type: 'number' },
  { key: 'width_m', label: 'Ancho', unit: 'm', group: 'Peso y dimensiones', type: 'number' },
  { key: 'diagonal_m', label: 'Diagonal (hélices extendidas)', unit: 'm', group: 'Peso y dimensiones', type: 'number' },
  { key: 'takeoff_landing_type', label: 'Tipo de despegue y aterrizaje', group: 'Desempeño', type: 'select', options: TAKEOFF_LANDING_TYPES },
  { key: 'max_ascent_speed_ms', label: 'Velocidad máx. de ascenso', unit: 'm/s', group: 'Desempeño', type: 'number' },
  { key: 'max_descent_speed_ms', label: 'Velocidad máx. de descenso', unit: 'm/s', group: 'Desempeño', type: 'number' },
  { key: 'max_flight_speed_ms', label: 'Velocidad máx. de vuelo', unit: 'm/s', group: 'Desempeño', type: 'number' },
  { key: 'max_wind_ms', label: 'Componente máxima de viento', unit: 'm/s', group: 'Desempeño', type: 'number' },
  { key: 'ceiling_m', label: 'Techo de servicio', unit: 'm', group: 'Desempeño', type: 'number' },
  { key: 'endurance_min', label: 'Autonomía', unit: 'min', group: 'Desempeño', type: 'number' },
  { key: 'range_m', label: 'Alcance', unit: 'm', group: 'Desempeño', type: 'number' },
  { key: 'temp_min_c', label: 'Temperatura mínima', unit: '°C', group: 'Desempeño', type: 'number' },
  { key: 'temp_max_c', label: 'Temperatura máxima', unit: '°C', group: 'Desempeño', type: 'number' },
  { key: 'battery_system', label: 'Batería o sistema equivalente', group: 'Sistemas', type: 'text' },
  { key: 'gnss_supported', label: 'GNSS soportados (separados por coma)', group: 'Sistemas', type: 'list' },
  { key: 'ip_rating', label: 'Certificación IP', group: 'Sistemas', type: 'text' },
  { key: 'obstacle_detection', label: 'Detección de obstáculos', group: 'Sistemas', type: 'bool' },
  { key: 'emergency_system', label: 'Sistema de emergencia', group: 'Sistemas', type: 'text' },
  { key: 'control_station', label: 'Estación de control', group: 'Sistemas', type: 'text' },
  { key: 'c2_link', label: 'Características del enlace C2', group: 'Enlace C2', type: 'c2' },
  { key: 'c2_limitations', label: 'Limitaciones del enlace', group: 'Enlace C2', type: 'text' },
];

// Subcampos del enlace C2 (Apéndice 1 Parte B).
export const C2_FIELDS = [
  { key: 'architecture', label: 'Arquitectura' },
  { key: 'topology', label: 'Topología' },
  { key: 'frequencies', label: 'Frecuencias' },
  { key: 'redundancy', label: 'Redundancia' },
  { key: 'coverage', label: 'Cobertura' },
  { key: 'latency', label: 'Latencia' },
  { key: 'encryption', label: 'Encriptación' },
  { key: 'providers', label: 'Proveedores externos C2 (C2CSP)' },
];

export const SPEC_FIELD_KEYS = SPEC_FIELDS.map((f) => f.key);
export const SPEC_GROUPS = [...new Set(SPEC_FIELDS.map((f) => f.group))];

const isFilled = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v).some((x) => isFilled(x));
  return true; // números (incluido 0) y booleanos (incluido false)
};

/** Completitud de la ficha de un modelo: { filled, total, pct, missing: [labels] }. */
export function computeSpecCompleteness(model) {
  const missing = SPEC_FIELDS.filter((f) => !isFilled(model?.[f.key])).map((f) => f.label);
  const total = SPEC_FIELDS.length;
  const filled = total - missing.length;
  return { filled, total, pct: Math.round((filled / total) * 100), missing };
}

/**
 * Limpia y valida lo que llega de la pantalla: solo campos del catálogo, números finitos y positivos donde
 * corresponde, opciones válidas. Vacío ('') se guarda como null. Devuelve { values, errors }.
 */
export function sanitizeSpecInput(input) {
  const values = {};
  const errors = [];
  for (const f of SPEC_FIELDS) {
    if (!(f.key in (input || {}))) continue;
    const raw = input[f.key];
    if (!isFilled(raw)) {
      values[f.key] = null;
      continue;
    }
    if (f.type === 'number') {
      const n = Number(raw);
      const canBeNegative = f.key === 'temp_min_c' || f.key === 'temp_max_c';
      if (!Number.isFinite(n) || (!canBeNegative && n <= 0)) errors.push(`${f.label}: debe ser un número ${canBeNegative ? '' : 'mayor que cero'}`.trim());
      else values[f.key] = n;
    } else if (f.type === 'bool') {
      if (typeof raw !== 'boolean') errors.push(`${f.label}: debe ser sí o no`);
      else values[f.key] = raw;
    } else if (f.type === 'list') {
      const arr = (Array.isArray(raw) ? raw : String(raw).split(',')).map((x) => String(x).trim()).filter(Boolean).slice(0, 20);
      values[f.key] = arr.length ? arr : null;
    } else if (f.type === 'c2') {
      const obj = {};
      for (const sub of C2_FIELDS) if (isFilled(raw?.[sub.key])) obj[sub.key] = String(raw[sub.key]).trim().slice(0, 300);
      values[f.key] = Object.keys(obj).length ? obj : null;
    } else if (f.type === 'select') {
      if (!f.options.includes(raw)) errors.push(`${f.label}: opción inválida`);
      else values[f.key] = raw;
    } else {
      values[f.key] = String(raw).trim().slice(0, 500);
    }
  }
  if (values.temp_min_c != null && values.temp_max_c != null && values.temp_min_c > values.temp_max_c) errors.push('La temperatura mínima no puede ser mayor que la máxima');
  if (values.pmbo_kg != null && values.mtow_kg != null && values.pmbo_kg > values.mtow_kg) errors.push('El PMBO no puede superar el MTOW');
  return { values, errors };
}

/** Valor legible de un atributo de la ficha (para PDF y pantallas de solo lectura). Vacío → '—'. */
export function formatSpecValue(field, value) {
  if (!isFilled(value)) return '—';
  if (field.type === 'bool') return value ? 'Sí' : 'No';
  if (field.type === 'list') return value.join(', ');
  if (field.type === 'c2') return C2_FIELDS.filter((c) => isFilled(value[c.key])).map((c) => `${c.label}: ${value[c.key]}`).join('; ');
  if (field.type === 'select') return field.optionLabels?.[value] || String(value);
  return field.unit ? `${value} ${field.unit}` : String(value);
}
