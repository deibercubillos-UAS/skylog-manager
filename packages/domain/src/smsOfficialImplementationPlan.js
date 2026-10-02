// smsOfficialImplementationPlan — las 4 fases OFICIALES de implementación
// del SMS para explotadores UAS (MAUT-5.0-22-017 §7.3.5,
// docs/skylog-v2/17-implementacion-sms-uas.md §1). Reemplaza la secuencia de
// 5 fases inventada de `smsImplementationProgress.js` (40-sms.md §5.2,
// corrección documentada 2026-09-30) — esa no se borra (sigue describiendo
// el asistente viejo, con cross-links desde la bitácora), esta es la nueva
// fuente de verdad para `/sms/asistente` desde SMS-C.
//
// Cada elemento oficial puede tener una fuente de dato AUTOMÁTICA (se
// detecta de tablas reales ya construidas en V2) o ser MANUAL (el Gerente
// SMS lo marca a mano porque no hay — y puede no haber nunca — un dato
// estructurado detrás: p. ej. "Comunicación" o "Gestión del cambio"). Lógica
// pura, con tests (regla Q2) — nunca se fabrica un dato que no exista.

export const OFFICIAL_PHASES = [
  { key: 1, label: 'Planificación del SMS' },
  { key: 2, label: 'Implementación de los Procesos Reactivos' },
  { key: 3, label: 'Implementación de los Procesos Proactivos y Predictivos' },
  { key: 4, label: 'Implementación de la Garantía de la Seguridad Operacional' },
];

/**
 * 17 elementos reales de la circular, agrupados por fase. `autoKey` referencia
 * una clave de `input` en `computeOfficialProgress()` — `null` si el elemento
 * es deliberadamente manual (ninguna tabla de V2 lo respalda hoy, o no es
 * del tipo de cosa que un sistema pueda detectar por sí solo).
 */
export const OFFICIAL_ELEMENTS = [
  // Fase 1 — Planificación
  { key: 'compromiso_direccion', phase: 1, label: 'Compromiso de la dirección', autoKey: 'policySigned' },
  { key: 'rendicion_cuentas', phase: 1, label: 'Rendición de cuentas y responsabilidades', autoKey: null },
  { key: 'designacion_personal_clave', phase: 1, label: 'Designación del personal clave', autoKey: 'gsoDesignated' },
  { key: 'plan_emergencias', phase: 1, label: 'Coordinación del plan de respuesta ante emergencias', autoKey: null },
  { key: 'msms_documentacion', phase: 1, label: 'Documentación (MSMS)', autoKey: 'msmsPublished' },
  // Fase 2 — Procesos Reactivos
  { key: 'identificacion_peligros_reactiva', phase: 2, label: 'Identificación de peligros (reactiva)', autoKey: 'hazardsRegistered' },
  { key: 'evaluacion_riesgo_reactiva', phase: 2, label: 'Evaluación y gestión de riesgos', autoKey: 'riskMatrixConfigured' },
  // Fase 3 — Procesos Proactivos y Predictivos
  { key: 'identificacion_peligros_proactiva', phase: 3, label: 'Identificación de peligros (proactiva y predictiva)', autoKey: 'spiWithHistory' },
  { key: 'evaluacion_riesgo_proactiva', phase: 3, label: 'Evaluación y gestión de riesgos', autoKey: 'riskMatrixConfigured' },
  // Fase 4 — Garantía de la Seguridad Operacional
  { key: 'compromiso_direccion_continuo', phase: 4, label: 'Compromiso de la dirección', autoKey: 'policySigned' },
  { key: 'observacion_rendimiento', phase: 4, label: 'Observación y medición del rendimiento', autoKey: 'spiWithHistory' },
  { key: 'gestion_cambio', phase: 4, label: 'Gestión del cambio', autoKey: null },
  { key: 'mejora_continua', phase: 4, label: 'Mejora continua', autoKey: 'gapAssessmentCompleted' },
  { key: 'msms_actualizacion', phase: 4, label: 'Actualización del MSMS', autoKey: 'msmsPublished' },
  { key: 'instruccion_educacion', phase: 4, label: 'Instrucción y educación', autoKey: 'trainingWithAttendance' },
  { key: 'comunicacion', phase: 4, label: 'Comunicación', autoKey: null },
  { key: 'registros', phase: 4, label: 'Registros', autoKey: null },
];

/**
 * `input` trae datos ya consultados de Supabase (nunca lógica de consulta
 * aquí): policySigned, gsoDesignated, hazardsRegistered, riskMatrixConfigured,
 * spiWithHistory (≥3 indicadores con ≥3 meses de datos), gapAssessmentCompleted
 * (siempre false hasta SMS-D), msmsPublished (siempre false hasta SMS-I),
 * trainingWithAttendance (≥1 sesión con asistencia real).
 * `manualDone` es un Set/array de `element_key` que el Gerente SMS ya marcó a
 * mano (solo aplica a elementos con `autoKey: null`; se ignora si el elemento
 * es automático — el dato real siempre manda sobre una casilla manual).
 */
export function computeElementStatus(element, input = {}, manualDone = []) {
  if (element.autoKey) return !!input[element.autoKey];
  return manualDone.includes(element.key);
}

export function computeOfficialProgress(input = {}, manualDone = []) {
  const elementStatus = {};
  for (const el of OFFICIAL_ELEMENTS) {
    elementStatus[el.key] = computeElementStatus(el, input, manualDone);
  }

  const phases = OFFICIAL_PHASES.map((phase) => {
    const elements = OFFICIAL_ELEMENTS.filter((el) => el.phase === phase.key);
    const done = elements.filter((el) => elementStatus[el.key]).length;
    return { ...phase, elements, doneCount: done, totalCount: elements.length, complete: done === elements.length };
  });

  const totalDone = Object.values(elementStatus).filter(Boolean).length;

  return {
    elementStatus,
    phases,
    totalDone,
    totalElements: OFFICIAL_ELEMENTS.length,
    progressPct: (totalDone / OFFICIAL_ELEMENTS.length) * 100,
    currentPhase: phases.find((p) => !p.complete)?.key || null,
  };
}

/** Horizonte válido del plan tipo Gantt — §7.3.5: "entre 12 y 24 meses". */
export function validatePlanHorizon(months) {
  return Number.isInteger(months) && months >= 12 && months <= 24;
}
