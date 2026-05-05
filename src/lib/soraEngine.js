/**
 * soraEngine.js — JARUS SORA v2.0 · Pure calculation functions
 * No React, no side-effects. All functions are deterministic.
 * Reference: JARUS SORA v2.0 (2019) + Colombian RAC 100 supplement
 */

// ─── 1. INTRINSIC GRC MATRIX ─────────────────────────────────────────────────
// Rows: UA characteristic dimension
// Cols: Operational scenario (index 0-5)
// Reference: JARUS SORA v2.0, Annex B, Table B-1
const INTRINSIC_GRC_MATRIX = {
  //              rural_vlos  rural_bvlos  pop_vlos  pop_bvlos  gather_vlos  gather_bvlos
  '<1m':          [1,          2,           3,         4,          5,           6],
  '1-3m':         [2,          3,           4,         5,          6,           7],
  '3-8m':         [3,          4,           5,         6,          7,           8],
  '8-20m':        [4,          5,           6,         7,          8,           9],
  '>20m':         [5,          6,           7,         8,          9,          10],
};

const SCENARIO_COL = {
  rural_vlos:      0,
  rural_bvlos:     1,
  populated_vlos:  2,
  populated_bvlos: 3,
  gathering_vlos:  4,
  gathering_bvlos: 5,
};

export const UA_DIMENSIONS   = ['<1m', '1-3m', '3-8m', '8-20m', '>20m'];
export const OP_SCENARIOS    = Object.keys(SCENARIO_COL);
export const SCENARIO_LABELS = {
  rural_vlos:      'Zona dispersa / rural — VLOS',
  rural_bvlos:     'Zona dispersa / rural — BVLOS',
  populated_vlos:  'Área poblada — VLOS',
  populated_bvlos: 'Área poblada — BVLOS',
  gathering_vlos:  'Concentración de personas — VLOS',
  gathering_bvlos: 'Concentración de personas — BVLOS',
};

export function calcIntrinsicGRC(uaDimension, opScenario) {
  const row = INTRINSIC_GRC_MATRIX[uaDimension];
  if (!row) return 1;
  const col = SCENARIO_COL[opScenario];
  if (col === undefined) return 1;
  return row[col];
}

/** Returns the full 5×6 matrix with the current selection coordinates */
export function getGRCMatrix() {
  return UA_DIMENSIONS.map(dim =>
    [0, 1, 2, 3, 4, 5].map(col => INTRINSIC_GRC_MATRIX[dim][col])
  );
}

// ─── 2. GROUND RISK MITIGATIONS ──────────────────────────────────────────────
// Reference: JARUS SORA v2.0, §6.2 Mitigations
const MITIGATION_DELTA = { none: 0, low: -1, medium: -2, high: -4 };

export const MITIGATION_LABELS = {
  none:   'Ninguna',
  low:    'Baja',
  medium: 'Media',
  high:   'Alta',
};

export const M1_DESCRIPTIONS = {
  none:   'Sin control sobre el área de operación',
  low:    'Área con baja densidad de personas confirmada',
  medium: 'Área controlada o restringida temporalmente',
  high:   'Área evacuada o completamente controlada',
};

export const M2_DESCRIPTIONS = {
  none:   'UA sin características de seguridad especiales',
  low:    'UA con baja energía cinética de impacto',
  medium: 'UA certificado con dispositivos de seguridad activos',
  high:   'UA certificado + paracaídas/airbag de emergencia homologado',
};

export function calcFinalGRC(intrinsicGRC, m1, m2, m3Emergency) {
  const delta =
    (MITIGATION_DELTA[m1] ?? 0) +
    (MITIGATION_DELTA[m2] ?? 0) +
    (m3Emergency ? -1 : 0);
  return Math.max(1, intrinsicGRC + delta);
}

// ─── 3. INITIAL ARC ──────────────────────────────────────────────────────────
// Reference: JARUS SORA v2.0, §6.3 / ICAO airspace classification
export const AIRSPACE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const AIRSPACE_LABELS  = {
  A: 'Clase A — Solo IFR, controlado',
  B: 'Clase B — IFR y VFR, alto tráfico controlado',
  C: 'Clase C — IFR y VFR separados, controlado',
  D: 'Clase D — IFR y VFR, controlado con separación parcial',
  E: 'Clase E — IFR controlado, VFR no separado',
  F: 'Clase F — Servicio de tránsito de asesoramiento',
  G: 'Clase G — Espacio aéreo no controlado',
};

export function calcInitialARC(heightM, airspaceClass) {
  const cls = (airspaceClass || 'G').toUpperCase();
  const h   = Number(heightM) || 0;

  if (['A', 'B'].includes(cls))      return 'ARC-d';
  if (cls === 'C')                   return 'ARC-c';
  if (cls === 'D')                   return h > 150 ? 'ARC-c' : 'ARC-b';
  if (cls === 'E')                   return h > 120 ? 'ARC-c' : 'ARC-b';
  // Class F or G (uncontrolled)
  if (h <= 120)                      return 'ARC-a';
  if (h <= 400)                      return 'ARC-b';
  return 'ARC-c';
}

export const ARC_DESCRIPTIONS = {
  'ARC-a': 'Tráfico aéreo despreciable — espacio aéreo no controlado a baja altura',
  'ARC-b': 'Tráfico aéreo bajo — espacio aéreo no controlado o tráfico ligero',
  'ARC-c': 'Tráfico aéreo moderado — espacio aéreo controlado de media densidad',
  'ARC-d': 'Tráfico aéreo denso — espacio aéreo controlado de alta densidad',
};

// ─── 4. STRATEGIC MITIGATIONS (ARC reduction) ────────────────────────────────
const ARC_LEVELS = ['ARC-a', 'ARC-b', 'ARC-c', 'ARC-d'];

export function calcFinalARC(initialARC, sm1, sm2, sm3) {
  let idx = ARC_LEVELS.indexOf(initialARC);
  if (idx <= 0) return 'ARC-a';
  const reductions  = (sm1 ? 1 : 0) + (sm2 ? 1 : 0) + (sm3 ? 1 : 0);
  const capped      = Math.min(reductions, 2); // max 2 levels reduction
  return ARC_LEVELS[Math.max(0, idx - capped)];
}

// ─── 5. SAIL MATRIX ──────────────────────────────────────────────────────────
// Reference: JARUS SORA v2.0, Table 2
//                        ARC-a  ARC-b  ARC-c  ARC-d
const SAIL_MATRIX = {
  1: [1, 2, 4, 4],
  2: [1, 2, 4, 4],
  3: [2, 3, 5, 5],
  4: [3, 4, 5, 5],
  5: [4, 5, 6, 6],
  6: [5, 5, 6, 6],
  7: [6, 6, 6, 6],
};
const ARC_COL      = { 'ARC-a': 0, 'ARC-b': 1, 'ARC-c': 2, 'ARC-d': 3 };
const SAIL_ROMANS  = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

export function calcSAIL(finalGRC, finalARC) {
  const grcKey = Math.min(Math.max(Math.round(finalGRC), 1), 7);
  const row    = SAIL_MATRIX[grcKey];
  if (!row) return 1;
  const col = ARC_COL[finalARC];
  if (col === undefined) return 1;
  return row[col]; // 1-6
}

export function sailRoman(n) {
  return SAIL_ROMANS[n] || 'I';
}

export function sailColor(n) {
  if (n <= 2) return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' };
  if (n <= 4) return { bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300'   };
  return            { bg: 'bg-red-100',       text: 'text-red-700',     border: 'border-red-300'     };
}

/** Full SAIL table for display (rows = GRC labels, cols = ARC) */
export const SAIL_TABLE_ROWS = [
  { label: 'GRC ≤ 2', key: 2 },
  { label: 'GRC 3',   key: 3 },
  { label: 'GRC 4',   key: 4 },
  { label: 'GRC 5',   key: 5 },
  { label: 'GRC 6',   key: 6 },
  { label: 'GRC ≥ 7', key: 7 },
];

// ─── 6. OSO LIST & REQUIREMENTS ──────────────────────────────────────────────
// Reference: JARUS SORA v2.0, Appendix A
// Robustness codes: '-'=N/A, 'O'=Opcional, 'L'=Baja, 'M'=Media, 'H'=Alta

export const OSO_LIST = [
  { id: 'OSO01', label: 'Operador UAS competente y con experiencia demostrada',             category: 'Recurso Humano'  },
  { id: 'OSO02', label: 'UAS fabricado conforme a estándares de diseño reconocidos',        category: 'Técnico'         },
  { id: 'OSO03', label: 'UAS mantenido conforme a estándares del fabricante',               category: 'Técnico'         },
  { id: 'OSO04', label: 'UAS equipado para condiciones adversas previsibles',               category: 'Técnico'         },
  { id: 'OSO05', label: 'UAS diseñado considerando seguridad y fiabilidad del sistema',     category: 'Técnico'         },
  { id: 'OSO06', label: 'Enlace C3 con características adecuadas para la operación',        category: 'Comunicaciones'  },
  { id: 'OSO07', label: 'Capacidad de detección y evitación (DAA) operativa',               category: 'Comunicaciones'  },
  { id: 'OSO08', label: 'UAS puede gestionar fallas de la unidad de mando en tierra',       category: 'Técnico'         },
  { id: 'OSO09', label: 'Contención de la operación ante pérdida del enlace C2',            category: 'Comunicaciones'  },
  { id: 'OSO10', label: 'Operación sobre entornos poblados — medidas adicionales aplicadas',category: 'Operacional'     },
  { id: 'OSO11', label: 'Procedimientos para área terrestre controlada documentados',       category: 'Operacional'     },
  { id: 'OSO12', label: 'Normas y requisitos de espacio aéreo cumplidos (RAC 100)',         category: 'Regulatorio'     },
  { id: 'OSO13', label: 'Servicios externos de apoyo a la operación UAS gestionados',       category: 'Operacional'     },
  { id: 'OSO14', label: 'Procedimientos operacionales seguros documentados y vigentes',     category: 'Operacional'     },
  { id: 'OSO15', label: 'Tripulación remota entrenada y vigente (CIPU/LPR válida)',         category: 'Recurso Humano'  },
  { id: 'OSO16', label: 'Coordinación de multi-tripulación establecida',                    category: 'Recurso Humano'  },
  { id: 'OSO17', label: 'Número de tripulación remota adecuado para la operación',          category: 'Recurso Humano'  },
  { id: 'OSO18', label: 'Protección automática del sobre de vuelo del UA activa',           category: 'Técnico'         },
  { id: 'OSO19', label: 'Recuperación segura ante pérdida de enlace C2 programada',        category: 'Comunicaciones'  },
  { id: 'OSO20', label: 'UA cumple estándares de diseño aplicables (ASTM/DO-178/etc.)',     category: 'Técnico'         },
  { id: 'OSO21', label: 'Conciencia situacional adecuada para el piloto remoto',            category: 'Operacional'     },
  { id: 'OSO22', label: 'Integridad de la carga útil mantenida durante toda la operación', category: 'Técnico'         },
  { id: 'OSO23', label: 'Condiciones ambientales consideradas en el diseño operacional',    category: 'Operacional'     },
  { id: 'OSO24', label: 'Evaluación de seguridad actualizada y válida para la operación',   category: 'Regulatorio'     },
];

// Robustness per SAIL level [idx 0 = SAIL I, ... idx 5 = SAIL VI]
const OSO_ROBUSTNESS = {
  OSO01: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO02: ['-', '-', 'L', 'L', 'M', 'H'],
  OSO03: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO04: ['-', '-', 'O', 'L', 'M', 'H'],
  OSO05: ['-', '-', 'L', 'L', 'M', 'H'],
  OSO06: ['-', '-', '-', 'L', 'M', 'H'],
  OSO07: ['-', '-', '-', 'O', 'L', 'M'],
  OSO08: ['-', '-', 'O', 'L', 'M', 'H'],
  OSO09: ['-', '-', '-', 'L', 'M', 'H'],
  OSO10: ['-', 'O', 'L', 'M', 'M', 'H'],
  OSO11: ['-', '-', 'O', 'L', 'M', 'H'],
  OSO12: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO13: ['-', '-', 'O', 'L', 'M', 'H'],
  OSO14: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO15: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO16: ['-', '-', 'O', 'L', 'M', 'H'],
  OSO17: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO18: ['-', '-', '-', 'O', 'L', 'M'],
  OSO19: ['-', '-', '-', 'L', 'M', 'H'],
  OSO20: ['-', '-', 'L', 'L', 'M', 'H'],
  OSO21: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO22: ['-', '-', 'O', 'L', 'L', 'M'],
  OSO23: ['-', 'L', 'L', 'M', 'M', 'H'],
  OSO24: ['-', 'L', 'L', 'M', 'M', 'H'],
};

export const ROBUSTNESS_LABELS = { '-': 'N/A', O: 'Opcional', L: 'Baja', M: 'Media', H: 'Alta' };
export const ROBUSTNESS_COLORS = {
  '-': 'bg-slate-100 text-slate-400',
  O:  'bg-slate-100 text-slate-500',
  L:  'bg-blue-100  text-blue-700',
  M:  'bg-amber-100 text-amber-700',
  H:  'bg-red-100   text-red-700',
};

/** Returns OSOs required for a given SAIL level (1-6), excluding N/A ones */
export function getOSOsForSAIL(sailLevel) {
  const idx = Math.min(Math.max((sailLevel ?? 1) - 1, 0), 5);
  return OSO_LIST.map(oso => ({
    ...oso,
    robustness: OSO_ROBUSTNESS[oso.id]?.[idx] ?? '-',
  })).filter(oso => oso.robustness !== '-');
}
