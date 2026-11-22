// Entorno del simulador (entregable 1.2): viento con ráfagas y degradación/pérdida de GNSS,
// brújula y enlace C2. TODO es función pura de (semilla, tiempo): el entorno no guarda estado,
// así que `windAt(t)` devuelve siempre lo mismo para el mismo t. Eso sostiene el determinismo (1.5).
//
// Convención del viento: `directionDeg` es la dirección HACIA la que sopla (0 = hacia el norte/+y,
// 90 = hacia el este/+x). El vector resultante es la velocidad del aire sobre el suelo.

import { mulberry32 } from './rng.js';

/**
 * @param {Object} cfg
 * @param {{speed?:number, directionDeg?:number, gust?:number}} [cfg.wind]
 *   speed: viento base (m/s) · gust: amplitud de ráfaga (m/s) · directionDeg: hacia dónde sopla
 * @param {Array<{at:number, until?:number, type:'gnss_loss'|'c2_loss'|'compass_interference'}>} [cfg.events]
 * @param {string|number} [cfg.seed]
 */
export function createEnvironment({ wind = {}, events = [], seed = 1 } = {}) {
  const baseSpeed = Math.max(0, wind.speed ?? 0);
  const dirRad = (wind.directionDeg ?? 0) * Math.PI / 180;
  const gust = Math.max(0, wind.gust ?? 0);

  // Ráfagas: suma de 4 armónicos con amplitud/frecuencia/fase derivadas de la semilla.
  const rnd = mulberry32(`${seed}:wind`);
  const harmonics = Array.from({ length: 4 }, () => ({
    amp: rnd(),
    freq: 0.03 + rnd() * 0.35, // Hz
    phase: rnd() * Math.PI * 2,
  }));
  const ampNorm = harmonics.reduce((s, h) => s + h.amp, 0) || 1;

  function gustAt(t) {
    if (!gust) return 0;
    let g = 0;
    for (const h of harmonics) g += h.amp * Math.sin(h.freq * 2 * Math.PI * t + h.phase);
    return gust * (g / ampNorm);
  }

  function windAt(t) {
    const speed = Math.max(0, baseSpeed + gustAt(t));
    return { x: speed * Math.sin(dirRad), y: speed * Math.cos(dirRad), speed };
  }

  const activeAt = (type, t) =>
    events.some((e) => e.type === type && t >= e.at && (e.until == null || t < e.until));

  return {
    seed,
    base: { speed: baseSpeed, dirRad, gust },
    windAt,
    gnssAt: (t) => ({ ok: !activeAt('gnss_loss', t) }),
    linkAt: (t) => ({ ok: !activeAt('c2_loss', t) }),
    compassAt: (t) => ({ ok: !activeAt('compass_interference', t) }),
  };
}

/** Entorno en calma, sin eventos (viento 0). Útil para pruebas de autonomía en estacionario. */
export function calmEnvironment(seed = 1) {
  return createEnvironment({ wind: { speed: 0 }, events: [], seed });
}
