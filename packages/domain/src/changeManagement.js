// changeManagement — gestión del cambio del SMS (RAC 219 §219.105(c)(2)). Lógica pura, con tests (regla Q2).
// Flujo: identificado → evaluado → implementado (o descartado desde cualquiera de los dos primeros).
// Un cambio que SÍ impacta la seguridad no se implementa sin un peligro enlazado y evaluado, ni sin dejar
// por escrito cómo se consideraron los factores humanos (E3.2 de la evaluación oficial).

export const CHANGE_TYPES = [
  { key: 'flota', label: 'Flota o equipo' },
  { key: 'procedimientos', label: 'Procedimientos' },
  { key: 'personal', label: 'Personal o roles' },
  { key: 'organizacion', label: 'Organización' },
  { key: 'infraestructura', label: 'Infraestructura o zonas' },
  { key: 'normativo', label: 'Cambio normativo' },
  { key: 'otro', label: 'Otro' },
];
export const CHANGE_STATUSES = ['identificado', 'evaluado', 'implementado', 'descartado'];
export const SAFETY_IMPACTS = ['por_evaluar', 'si', 'no'];

const filled = (v) => (v || '').trim().length > 0;

export function validateChangeInput({ title, changeType }) {
  const errors = [];
  if (!filled(title)) errors.push('Escribe el nombre del cambio.');
  else if (title.trim().length > 200) errors.push('El nombre del cambio es demasiado largo (máximo 200 caracteres).');
  if (changeType && !CHANGE_TYPES.some((t) => t.key === changeType)) errors.push('Tipo de cambio inválido.');
  return { ok: errors.length === 0, errors };
}

/**
 * ¿Se puede pasar el cambio al estado `toStatus`?
 * `change` es la fila con sus valores YA actualizados; `hazardAssessed` indica si el peligro enlazado
 * tiene al menos una evaluación de riesgo. Devuelve { ok, errors }.
 */
export function evaluateTransition({ change, toStatus, hazardAssessed }) {
  const errors = [];
  const from = change.status;

  if (from === 'implementado' || from === 'descartado') {
    return { ok: false, errors: ['Este cambio ya está cerrado.'] };
  }

  if (toStatus === 'descartado') {
    if (!filled(change.decision_notes)) errors.push('Explica por qué se descarta el cambio.');
    return { ok: errors.length === 0, errors };
  }

  if (toStatus === 'evaluado') {
    if (from !== 'identificado') errors.push('Solo un cambio identificado puede pasar a evaluado.');
    if (!change.safety_impact || change.safety_impact === 'por_evaluar') errors.push('Indica si el cambio impacta la seguridad operacional.');
    if (!filled(change.impact_justification)) errors.push('Justifica la decisión sobre el impacto en la seguridad.');
    if (change.safety_impact === 'si' && !change.hazard_id) errors.push('Un cambio que impacta la seguridad necesita un peligro enlazado para gestionar su riesgo.');
    return { ok: errors.length === 0, errors };
  }

  if (toStatus === 'implementado') {
    if (from !== 'evaluado') errors.push('Evalúa el cambio antes de implementarlo.');
    if (change.safety_impact === 'si') {
      if (!change.hazard_id) errors.push('Enlaza el peligro asociado antes de implementar.');
      else if (!hazardAssessed) errors.push('El peligro enlazado todavía no tiene una evaluación de riesgo.');
      if (!filled(change.human_factors_notes)) errors.push('Deja por escrito cómo se consideraron los factores humanos.');
    }
    return { ok: errors.length === 0, errors };
  }

  return { ok: false, errors: ['Estado inválido.'] };
}
