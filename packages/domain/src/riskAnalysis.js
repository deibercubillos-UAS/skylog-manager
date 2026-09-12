// riskAnalysis — MAUT-5.0-12-055 (análisis de riesgos para la operación aérea UA).
// Lógica pura: la matriz de probabilidad/severidad/tolerabilidad es FIJA por la
// autoridad (regla C2, 01-reglas.md §5b) — no configurable por la organización,
// a diferencia de la matriz de riesgo del SMS interno (30-entidades.md/
// 31-esquema-datos.md, R1 de 18-analisis-riesgos-vuelo.md). Sin Supabase, con
// tests — regla Q2 (lógica regulatoria no se verifica de memoria).
// Fuente: docs/skylog-v2/18-analisis-riesgos-vuelo.md.

// §2 — 5 niveles de probabilidad, código 1 (más bajo) a 5 (más alto).
export const PROBABILITY_LEVELS = {
  5: { label: 'Frecuente', criterion: 'Es probable que suceda muchas veces (ha ocurrido frecuentemente)' },
  4: { label: 'Ocasional', criterion: 'Es probable que ocurra algunas veces (ha ocurrido con muy poca frecuencia)' },
  3: { label: 'Remoto', criterion: 'Es poco probable que ocurra, pero no imposible (rara vez ha ocurrido)' },
  2: { label: 'Improbable', criterion: 'Es muy poco probable que ocurra (no se sabe que haya ocurrido)' },
  1: { label: 'Sumamente improbable', criterion: 'Es casi inconcebible que el suceso ocurra' },
};

// 5 niveles de severidad, código A (más grave) a E (más leve).
export const SEVERITY_LEVELS = {
  A: { label: 'Catastrófico', criterion: 'Aeronave o equipo destruidos · varias muertes' },
  B: { label: 'Peligroso', criterion: 'Gran reducción de márgenes de seguridad · lesiones graves · daños importantes al equipo' },
  C: { label: 'Grave', criterion: 'Reducción importante de márgenes · incidente grave · lesiones a personas' },
  D: { label: 'Leve', criterion: 'Molestias · limitaciones operacionales · uso de procedimientos de emergencia · incidente leve' },
  E: { label: 'Insignificante', criterion: 'Pocas consecuencias' },
};

// §4 — las 25 combinaciones probabilidad×severidad, fijas, sin solapamiento
// (6 INTOLERABLE + 12 TOLERABLE + 7 ACEPTABLE). Vocabulario oficial exacto —
// no "inaceptable" (R2 del documento fuente).
const TOLERABILITY_MAP = {
  '5A': 'INTOLERABLE', '5B': 'INTOLERABLE', '5C': 'INTOLERABLE',
  '4A': 'INTOLERABLE', '4B': 'INTOLERABLE', '3A': 'INTOLERABLE',
  '5D': 'TOLERABLE', '5E': 'TOLERABLE', '4C': 'TOLERABLE', '4D': 'TOLERABLE', '4E': 'TOLERABLE',
  '3B': 'TOLERABLE', '3C': 'TOLERABLE', '3D': 'TOLERABLE',
  '2A': 'TOLERABLE', '2B': 'TOLERABLE', '2C': 'TOLERABLE', '1A': 'TOLERABLE',
  '3E': 'ACEPTABLE', '2D': 'ACEPTABLE', '2E': 'ACEPTABLE',
  '1B': 'ACEPTABLE', '1C': 'ACEPTABLE', '1D': 'ACEPTABLE', '1E': 'ACEPTABLE',
};

export const TOLERABILITY_MEASURES = {
  INTOLERABLE: 'Tomar medidas inmediatas para mitigar el riesgo o suspender la actividad',
  TOLERABLE: 'Puede tolerarse sobre la base de la mitigación — puede necesitar una decisión de gestión para aceptar el riesgo',
  ACEPTABLE: 'Aceptable tal cual. No se necesita una mitigación de riesgos posterior',
};

// §Estrategias de mitigación — lista cerrada de tres (R6).
export const MITIGATION_STRATEGIES = ['Evitar', 'Reducir', 'Segregar'];

/** Índice de riesgo (ej. "3A") a partir de probabilidad (1-5) y severidad (A-E). */
export function riskIndex(probabilityCode, severityCode) {
  return `${probabilityCode}${severityCode}`;
}

/** Zona de tolerabilidad oficial — nunca "inaceptable", solo INTOLERABLE/TOLERABLE/ACEPTABLE. */
export function toleranceZone(probabilityCode, severityCode) {
  const index = riskIndex(probabilityCode, severityCode);
  const zone = TOLERABILITY_MAP[index];
  if (!zone) {
    throw new Error(`Índice de riesgo inválido: ${index} — probabilidad debe ser 1-5, severidad A-E`);
  }
  return zone;
}

// §3 — catálogo fijo de 24 peligros (regla C2: formato oficial, no editable).
// category: (i) personal operativo, (ii) personal ajeno, (iii) tierra, (iv) aire,
// (v) estratégico. (vi)/(vii) existen en la taxonomía pero sin preguntas fijas —
// solo aparecen si el cliente agrega un peligro libre de esa categoría.
export const HAZARD_CATALOG = [
  { number: 1, category: 'personal_operativo', question: '¿La operación será realizada por menos de dos personas?' },
  { number: 2, category: 'personal_ajeno', question: '¿Vuela sobre personas que no hacen parte de la operación?' },
  { number: 3, category: 'personal_ajeno', question: '¿Habrá presencia de público espectador de la operación aérea UAS?' },
  { number: 4, category: 'personal_ajeno', question: '¿El vuelo captura información que vulnere la intimidad o privacidad de alguna persona?' },
  { number: 5, category: 'tierra', question: '¿Va a sobrevolar propiedades, edificaciones o infraestructura?' },
  { number: 6, category: 'tierra', question: '¿Le falta identificar alguno de los obstáculos en la trayectoria del vuelo BVLOS o autónomo?' },
  { number: 7, category: 'tierra', question: '¿La UA es cautiva?' },
  { number: 8, category: 'tierra', question: '¿El vuelo se realizará en un espacio cerrado, confinado o bajo techo?' },
  { number: 9, category: 'tierra', question: '¿El punto de despegue o aterrizaje se ubica sobre un vehículo, embarcación o aeronave en movimiento?' },
  { number: 10, category: 'tierra', question: '¿Desde la posición del piloto u observador se está expuesto a perder el contacto visual del UA en un radio de 750 m horizontalmente?' },
  { number: 11, category: 'aire', question: '¿Realizará su vuelo posterior a que se oculta el sol?' },
  { number: 12, category: 'aire', question: '¿Es necesario que el UA exceda alguna de las limitantes establecidas por el fabricante?' },
  { number: 13, category: 'aire', question: '¿La operación incluye transporte de carga que pueda afectar la dinámica del vuelo?' },
  { number: 14, category: 'aire', question: '¿La operación es autónoma y supera los 750 m horizontales desde el punto de despegue?' },
  { number: 15, category: 'aire', question: '¿Ha identificado la operación de otros UAS en mi zona de vuelo?' },
  { number: 16, category: 'aire', question: '¿Han pasado más de 60 días después del último mantenimiento su UAS?' },
  { number: 17, category: 'aire', question: '¿Ha identificado condiciones en la operación en las que se pueda perder o intervenir el enlace C2?' },
  { number: 18, category: 'aire', question: '¿El vuelo es de tipo FPV?' },
  { number: 19, category: 'aire', question: '¿Desconoce las condiciones meteorológicas del sitio y durante las fechas de operación?' },
  { number: 20, category: 'estrategico', question: '¿Vuela en espacio aéreo controlado por ATC?' },
  { number: 21, category: 'estrategico', question: '¿La altura de vuelo será mayor a 400 metros AGL?' },
  { number: 22, category: 'estrategico', question: '¿En las cartas aéreas identificó rutas aéreas que crucen sobre su zona de vuelo UA?' },
  { number: 23, category: 'estrategico', question: '¿El vuelo se realizará a menos de 5 km del ARP de un aeródromo?' },
  { number: 24, category: 'estrategico', question: '¿El vuelo se realizará a menos de 2 km del ARH de un helipuerto?' },
];

export const HAZARD_CATEGORIES = [
  'personal_operativo',
  'personal_ajeno',
  'tierra',
  'aire',
  'estrategico',
  'cambio_normativo', // (vi) — sin preguntas fijas, solo peligros libres
  'gestion_del_cambio', // (vii) — sin preguntas fijas, solo peligros libres
];

/**
 * Valida una fila de evaluación de un peligro respondido "Sí" (§2 del formato:
 * las etapas 2-4 solo aplican a las preguntas en Sí).
 * R4: Tolerable e Intolerable exigen justificar defensas por escrito —
 * más estricto que "solo la peor zona exige mitigar" (lo implementado en v1).
 */
export function validateHazardEvaluation({
  answer,
  probabilityCode,
  severityCode,
  mitigationStrategy,
  mitigationDescription,
  residualProbabilityCode,
  residualSeverityCode,
  residualJustification,
}) {
  if (answer !== true) {
    return { applicable: false, errors: [] };
  }

  const errors = [];
  if (!probabilityCode || !severityCode) {
    errors.push('Probabilidad y severidad son requeridas para un peligro en Sí');
    return { applicable: true, compliant: false, errors };
  }

  const zone = toleranceZone(probabilityCode, severityCode);

  if (zone !== 'ACEPTABLE') {
    if (!mitigationStrategy || !MITIGATION_STRATEGIES.includes(mitigationStrategy)) {
      errors.push(`Zona ${zone}: requiere una estrategia de mitigación (${MITIGATION_STRATEGIES.join('/')})`);
    }
    if (!mitigationDescription) {
      errors.push(`Zona ${zone}: requiere justificar por escrito las defensas implementadas`);
    }
    if (!residualProbabilityCode || !residualSeverityCode) {
      errors.push(`Zona ${zone}: requiere evaluar el riesgo residual tras la mitigación`);
    } else {
      const residualZone = toleranceZone(residualProbabilityCode, residualSeverityCode);
      if (residualZone !== 'ACEPTABLE' && !residualJustification) {
        errors.push(`Riesgo residual ${residualZone}: requiere justificar acciones adicionales`);
      }
    }
  }

  return { applicable: true, zone, compliant: errors.length === 0, errors };
}

/**
 * Evalúa el análisis de riesgos completo — un array de respuestas a los 24
 * peligros del catálogo (+ libres) — y determina si puede firmarse.
 * `hazards`: [{ number, answer, probabilityCode, severityCode, mitigationStrategy,
 *   mitigationDescription, residualProbabilityCode, residualSeverityCode,
 *   residualJustification }]
 */
export function evaluateRiskAnalysis(hazards) {
  const evaluations = hazards.map((h) => ({ number: h.number, ...validateHazardEvaluation(h) }));
  const errors = evaluations.filter((e) => e.applicable && !e.compliant);
  return {
    canSign: errors.length === 0,
    evaluations,
    errors,
  };
}
