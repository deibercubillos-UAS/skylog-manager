// Editar y anular vuelos (matriz D6). Reglas puras: validación de la ventana, qué cambió y cómo ajustar las horas de la aeronave.
// Un vuelo es un evento: se corrige dejando constancia (quién, cuándo, por qué) y se anula, no se borra.
const VISUAL_CONDITIONS = ['VLOS', 'EVLOS', 'BVLOS'];
const FLIGHT_RULES = ['VMC', 'IMC', 'NIGHT'];
export const FLIGHT_EDITABLE_FIELDS = ['pilot_person_id', 'takeoff_at', 'landing_at', 'total_time', 'visual_condition', 'mission_type', 'aircraft_id', 'location', 'notes', 'flight_rules'];

/** Roles que pueden figurar como piloto de un vuelo (el Gerente SMS no vuela). */
export const FLIGHT_PILOT_ROLES = ['admin', 'jefe_pilotos', 'piloto'];
export const canBeFlightPilot = (role) => FLIGHT_PILOT_ROLES.includes(role);

/** Un vuelo cerrado desde un despacho tiene el piloto de la constancia del despacho (inmutable): no se le cambia el piloto. */
export const flightPilotLocked = (flight) => flight?.source === 'despacho' || Boolean(flight?.mission_id);

export const FLIGHT_REASON_LIMITS = { min: 5, max: 500 };

/** Motivo obligatorio para editar o anular: texto recortado de 5 a 500 caracteres. */
export function validateFlightReason(reason) {
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < FLIGHT_REASON_LIMITS.min) return { ok: false, error: `Escribe el motivo (mínimo ${FLIGHT_REASON_LIMITS.min} caracteres)` };
  if (text.length > FLIGHT_REASON_LIMITS.max) return { ok: false, error: `El motivo no puede pasar de ${FLIGHT_REASON_LIMITS.max} caracteres` };
  return { ok: true, reason: text };
}

/** Mismas reglas que el registro de un vuelo: aterrizaje posterior al despegue y duración no mayor a la ventana (+6 min de margen). */
export function validateFlightFields({ takeoff_at, landing_at, total_time, visual_condition, flight_rules }) {
  const takeoff = new Date(takeoff_at);
  const landing = new Date(landing_at);
  if (Number.isNaN(takeoff.getTime()) || Number.isNaN(landing.getTime())) return { ok: false, error: 'Fechas de despegue y aterrizaje no válidas' };
  if (landing <= takeoff) return { ok: false, error: 'El aterrizaje debe ser posterior al despegue' };
  const windowHours = (landing - takeoff) / 3600000;
  const time = Number(total_time);
  if (!(time > 0) || time > windowHours + 0.1) return { ok: false, error: 'La duración del vuelo no puede ser mayor que el tiempo entre despegue y aterrizaje' };
  if (visual_condition && !VISUAL_CONDITIONS.includes(visual_condition)) return { ok: false, error: 'La condición visual debe ser VLOS, EVLOS o BVLOS' };
  if (flight_rules && !FLIGHT_RULES.includes(flight_rules)) return { ok: false, error: 'Las reglas de vuelo deben ser VMC, IMC o NIGHT' };
  return { ok: true };
}

const sameValue = (a, b) => {
  if (a == null && b == null) return true;
  if (typeof a === 'string' && typeof b === 'string' && !Number.isNaN(Date.parse(a)) && !Number.isNaN(Date.parse(b)) && /\d{4}-\d{2}-\d{2}T/.test(a) && /\d{4}-\d{2}-\d{2}T/.test(b)) return Date.parse(a) === Date.parse(b);
  if (typeof a === 'number' || typeof b === 'number') return Number(a) === Number(b);
  return a === b;
};

/** Campos que cambiaron, con su valor antes y después (para el registro de acciones). */
export function diffFlight(before, after) {
  const changes = {};
  for (const key of FLIGHT_EDITABLE_FIELDS) {
    if (!sameValue(before?.[key] ?? null, after?.[key] ?? null)) changes[key] = { before: before?.[key] ?? null, after: after?.[key] ?? null };
  }
  return changes;
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Ajustes de horas por aeronave al editar un vuelo: [{ aircraftId, delta }] (delta puede ser negativo). Sin cambios → []. */
export function aircraftHoursAdjustments(before, after) {
  const out = [];
  const oldId = before?.aircraft_id || null;
  const newId = after?.aircraft_id || null;
  const oldTime = Number(before?.total_time) || 0;
  const newTime = Number(after?.total_time) || 0;
  if (oldId && oldId === newId) {
    const delta = round2(newTime - oldTime);
    if (delta !== 0) out.push({ aircraftId: oldId, delta });
    return out;
  }
  if (oldId && oldTime) out.push({ aircraftId: oldId, delta: round2(-oldTime) });
  if (newId && newTime) out.push({ aircraftId: newId, delta: round2(newTime) });
  return out;
}

/** Al anular un vuelo se restan sus horas a la aeronave. */
export function voidHoursAdjustment(flight) {
  const time = Number(flight?.total_time) || 0;
  return flight?.aircraft_id && time ? [{ aircraftId: flight.aircraft_id, delta: round2(-time) }] : [];
}
