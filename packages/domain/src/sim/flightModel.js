// Modelo de vuelo (entregable 1.1): dinámica del dron paso a paso, con modos GNSS/ATTI/Deportivo.
// Es cinemática de primer orden con paso fijo — simple, determinista y suficiente para entrenar
// la SENSACIÓN y los procedimientos, no un simulador aerodinámico de alta fidelidad.
//
// Marco: x = este (+), y = norte (+), z = altura sobre el suelo (+). heading 0 = mirando al norte.
// La diferencia clave entre modos vive aquí:
//   • GNSS / Deportivo → MANTIENEN posición: con las palancas al centro frenan y aguantan el punto,
//     rechazando el viento (el controlador apunta a una velocidad SOBRE EL SUELO).
//   • ATTI → NO mantiene posición: solo sostiene actitud, así que con las palancas al centro el
//     viento lo ARRASTRA (el controlador apunta a una velocidad respecto AL AIRE; el motor le suma
//     el viento en `integrate`).

import { clamp, approach, wrapAngle, DEG } from './util.js';

export const MODES = ['GNSS', 'ATTI', 'SPORT'];

// CONSTANTES DE CONTROL del simulador (NO son cifras publicadas de la aeronave). DJI no publica la
// velocidad de giro ni un tope separado para el modo normal/posición, así que aquí son parámetros
// de SENSACIÓN de vuelo, ajustables, no datos de ficha técnica (regla Q2: no se presentan como tales).
export const SIM_YAW_RATE_DEG = 120; // velocidad de giro por defecto (°/s)
export const NORMAL_SPEED_FACTOR = 0.5; // el modo normal/posición limita al 50 % de la velocidad máx.

/** Parámetros efectivos de un modo para un perfil dado. */
export function modeParams(profile, mode) {
  // DJI publica una sola velocidad horizontal máxima: es el tope del modo deportivo; el modo
  // normal/posición es una limitación de control del simulador (NORMAL_SPEED_FACTOR).
  const maxH = mode === 'SPORT' ? profile.maxSpeedMs : profile.maxSpeedMs * NORMAL_SPEED_FACTOR;
  return {
    mode,
    maxH,
    maxTiltDeg: profile.maxTiltDeg,
    maxAscent: profile.maxAscent,
    maxDescent: profile.maxDescent,
    yawRate: SIM_YAW_RATE_DEG,
    // Alcanza su velocidad máxima en ~1,5 s en normal y ~1 s en deportivo (respuesta configurable).
    accelH: maxH / (mode === 'SPORT' ? 1.0 : 1.5),
    accelV: profile.maxAscent / 1.0,
    // GNSS y Deportivo mantienen posición; ATTI no.
    positionHold: mode !== 'ATTI',
  };
}

/**
 * Convierte las palancas (cuerpo del dron) en una velocidad objetivo SOBRE EL SUELO (marco mundo)
 * más la tasa de giro y el objetivo vertical. No aplica viento: de eso se encarga `integrate`.
 * @param {{roll?:number,pitch?:number,throttle?:number,yaw?:number}} input palancas en [-1, 1]
 */
export function resolveStickTarget(input, heading, p) {
  const roll = clamp(input.roll ?? 0, -1, 1); // + derecha
  const pitch = clamp(input.pitch ?? 0, -1, 1); // + adelante
  const throttle = clamp(input.throttle ?? 0, -1, 1); // + arriba
  const yaw = clamp(input.yaw ?? 0, -1, 1); // + horario
  const bodyX = roll * p.maxH;
  const bodyY = pitch * p.maxH;
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  return {
    tgx: bodyX * cos + bodyY * sin,
    tgy: -bodyX * sin + bodyY * cos,
    tgz: throttle >= 0 ? throttle * p.maxAscent : throttle * p.maxDescent,
    headingRate: yaw * p.yawRate * DEG,
  };
}

/**
 * Integra un paso fijo `dt` a partir de una velocidad objetivo ya resuelta (marco mundo).
 * @param {Object} opts
 * @param {{x:number,y:number}} opts.wind
 * @param {boolean} opts.positionHold  si es false (ATTI), el viento se suma al objetivo → deriva
 */
export function integrate(state, target, p, dt, { wind, positionHold }) {
  const heading = wrapAngle(state.heading + target.headingRate * dt);
  let tgx = target.tgx;
  let tgy = target.tgy;
  if (!positionHold) {
    tgx += wind.x;
    tgy += wind.y;
  }
  const vx = approach(state.vx, tgx, p.accelH * dt);
  const vy = approach(state.vy, tgy, p.accelH * dt);
  let vz = approach(state.vz, target.tgz, p.accelV * dt);
  const x = state.x + vx * dt;
  const y = state.y + vy * dt;
  let z = state.z + vz * dt;
  if (z <= 0) {
    z = 0;
    if (vz < 0) vz = 0; // el suelo detiene el descenso
  }
  const landed = z <= 0 && target.tgz <= 0 && Math.hypot(vx, vy) < 0.2 && vz <= 0.01;
  return { x, y, z, vx, vy, vz, heading, landed };
}

/** Un paso de vuelo manual: resuelve las palancas y las integra. Devuelve el nuevo estado cinemático. */
export function stepFlight(state, input, { profile, mode, wind, dt }) {
  const p = modeParams(profile, mode);
  const target = resolveStickTarget(input, state.heading, p);
  return integrate(state, target, p, dt, { wind, positionHold: p.positionHold });
}
