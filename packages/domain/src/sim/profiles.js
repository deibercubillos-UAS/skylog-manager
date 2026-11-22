// Perfiles de aeronave del simulador (entregable 1.6 del plan, decisión D-SIM-7: Mini 5 Pro y
// Matrice 4). Un perfil es SOLO datos; el motor es genérico (no se usa ningún SDK de fabricante).
//
// REGLA Q2 — ningún valor numérico de aeronave sin fuente. TODAS las cifras de abajo salen de la
// ficha técnica OFICIAL de DJI (campo `source`, con la fecha de consulta). Lo que DJI NO publica
// NO se inventa: el campo se omite (instrucción del usuario, 2026-11-22). En concreto DJI no
// publica la velocidad de giro (yaw) ni un tope de velocidad separado para modo normal/posición;
// esos dos parámetros son CONSTANTES DE CONTROL del simulador (ver flightModel.js), no cifras de
// la aeronave, así que no aparecen aquí.
//
// `enduranceKind` dice QUÉ autonomía publica DJI: Matrice 4 publica tiempo de ESTACIONARIO; el
// Mini 5 Pro solo publica tiempo máximo de vuelo FRONTAL (no hay dato de estacionario). El modelo
// de batería se ancla a la cifra publicada y el HUD puede mostrar el régimen con honestidad.

/**
 * Campos de un perfil. Solo los que DJI publica. Todos > 0 salvo los textuales.
 * @typedef {Object} AircraftProfile
 * @property {string} id
 * @property {string} label
 * @property {'consumo'|'enterprise'} class
 * @property {string} source          URL de la ficha oficial + fecha de consulta
 * @property {string} [note]          variante de batería / hélice a la que corresponden las cifras
 * @property {number} takeoffWeightKg peso de despegue (kg)
 * @property {number} maxSpeedMs       velocidad horizontal máx. publicada (m/s)
 * @property {number} maxAscent        ascenso máx. (m/s)
 * @property {number} maxDescent       descenso máx. (m/s)
 * @property {number} maxTiltDeg       inclinación máx. (grados)
 * @property {number} maxWind          resistencia al viento publicada (m/s)
 * @property {number} capacityWh       energía de la batería (Wh)
 * @property {number} enduranceS       autonomía publicada (s)
 * @property {'hover'|'forward'} enduranceKind  régimen de esa autonomía
 */

const CONSULTED = 'consultado 2026-11-22';

/** @type {Record<string, AircraftProfile>} */
export const PROFILES = {
  'dji-mini-5-pro': {
    id: 'dji-mini-5-pro', label: 'DJI Mini 5 Pro', class: 'consumo',
    source: `https://www.dji.com/mini-5-pro/specs (${CONSULTED})`,
    note: 'Batería estándar (modo S). DJI no publica tiempo de estacionario; enduranceS es el tiempo máx. de vuelo frontal.',
    takeoffWeightKg: 0.2499, // 249,9 g
    maxSpeedMs: 18, // modo S, batería estándar
    maxAscent: 10, // modo S
    maxDescent: 6, // modo S, batería estándar
    maxTiltDeg: 38,
    maxWind: 12,
    capacityWh: 19.52, // batería estándar
    enduranceS: 2160, // 36 min (vuelo frontal hasta agotar, en túnel de viento)
    enduranceKind: 'forward',
  },
  'dji-matrice-4': {
    id: 'dji-matrice-4', label: 'DJI Matrice 4', class: 'enterprise',
    source: `https://enterprise.dji.com/matrice-4-series/specs (${CONSULTED})`,
    note: 'Hélices estándar, sin carga útil.',
    takeoffWeightKg: 1.219, // 1219 g con hélices estándar
    maxSpeedMs: 21, // adelante, a nivel del mar, sin viento
    maxAscent: 10,
    maxDescent: 8,
    maxTiltDeg: 35,
    maxWind: 12, // durante despegue y aterrizaje
    capacityWh: 99.5,
    enduranceS: 2520, // 42 min de estacionario, hélices estándar
    enduranceKind: 'hover',
  },
};

const REQUIRED_POSITIVE = [
  'takeoffWeightKg', 'maxSpeedMs', 'maxAscent', 'maxDescent', 'maxWind', 'capacityWh', 'enduranceS',
];

/** Valida que un perfil tenga todos los campos numéricos obligatorios > 0 y una fuente. Lanza si no. */
export function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') throw new Error('Perfil inválido');
  if (!profile.id) throw new Error('El perfil necesita un id');
  if (!profile.source) throw new Error(`Perfil ${profile.id}: falta la fuente (regla Q2)`);
  for (const k of REQUIRED_POSITIVE) {
    const v = profile[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
      throw new Error(`Perfil ${profile.id}: el campo "${k}" debe ser un número > 0 (recibido: ${v})`);
    }
  }
  if (profile.enduranceKind !== 'hover' && profile.enduranceKind !== 'forward') {
    throw new Error(`Perfil ${profile.id}: enduranceKind debe ser 'hover' o 'forward'`);
  }
  if (profile.maxTiltDeg != null && !(profile.maxTiltDeg > 0)) {
    throw new Error(`Perfil ${profile.id}: maxTiltDeg, si está, debe ser > 0`);
  }
  return true;
}

/** Devuelve un perfil por id (o lanza si no existe). */
export function getProfile(id) {
  const p = PROFILES[id];
  if (!p) throw new Error(`Perfil desconocido: ${id}`);
  return p;
}

export function listProfiles() {
  return Object.values(PROFILES);
}
