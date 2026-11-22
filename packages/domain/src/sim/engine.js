// Motor del simulador: integra modelo de vuelo + entorno + batería + automatismos en un paso fijo.
// `advance` es una función PURA: (estado, entrada, contexto) → nuevo estado. No hay estado oculto
// ni Math.random(); el entorno es función de (semilla, tiempo). Eso cumple el requisito 1.5 del
// plan: la misma semilla y las mismas entradas producen siempre el mismo estado final, lo que
// permite recalcular la nota en el servidor y reproducir el vuelo en el debriefing.

import { modeParams, resolveStickTarget, integrate } from './flightModel.js';
import { powerDrawW, drainBattery, batteryPercent, batteryStatus } from './battery.js';
import { rthTarget, hoverTarget, descendTarget } from './automation.js';

export const DEFAULT_DT = 1 / 30;

export const DEFAULT_CONFIG = {
  rthAltitudeM: 40, // altura a la que el RTH asciende antes de volver
  rthBatteryPct: 20, // batería que dispara el RTH automático
  forcedLandingPct: 5, // batería que fuerza el aterrizaje
  warnPct: 30, // primer aviso de batería
  linkLossAction: 'rth', // 'rth' | 'land' | 'hover'
  linkLossDelayS: 3, // segundos de enlace perdido antes de actuar
  home: { x: 0, y: 0 },
  cruiseSpeed: null, // null = velocidad normal del perfil
  batteryFraction: 1, // carga inicial (0–1)
};

export function mergeConfig(config) {
  return { ...DEFAULT_CONFIG, ...(config || {}) };
}

/** Estado inicial en el suelo (o a una altura dada), con batería según la fracción configurada. */
export function createInitialState(profile, { z = 0, batteryFraction = 1 } = {}) {
  return {
    t: 0,
    x: 0, y: 0, z,
    vx: 0, vy: 0, vz: 0,
    heading: 0,
    mode: 'GNSS',
    battery: { energyWh: profile.capacityWh * batteryFraction },
    rthActive: false,
    forced: false,
    phase: 'idle',
    linkLostSince: null,
    gnssOk: true,
    linkOk: true,
    windSpeed: 0,
    landed: z <= 0,
  };
}

/**
 * Avanza un paso. `input` admite palancas (roll/pitch/throttle/yaw), el modo deseado (`mode`),
 * y banderas de autopiloto (`engageRth`, `cancelRth`).
 * @param {Object} ctx { profile, environment, config, dt }
 */
export function advance(state, input = {}, ctx) {
  const { profile, environment } = ctx;
  const config = mergeConfig(ctx.config);
  const dt = ctx.dt ?? DEFAULT_DT;
  const t = state.t;

  const wind = environment.windAt(t);
  const gnssOk = environment.gnssAt(t).ok;
  const linkOk = environment.linkAt(t).ok;
  const pct = batteryPercent(state.battery, profile);

  // Seguimiento de la pérdida de enlace (desde cuándo).
  let linkLostSince = state.linkLostSince;
  if (!linkOk && linkLostSince == null) linkLostSince = t;
  if (linkOk) linkLostSince = null;
  const linkLostFor = linkLostSince == null ? 0 : t - linkLostSince;

  // Activación del RTH y del aterrizaje forzado.
  let rthActive = state.rthActive;
  if (input.engageRth) rthActive = true;
  if (input.cancelRth) rthActive = false;
  if (pct <= config.rthBatteryPct) rthActive = true; // batería baja: automático
  let forced = pct <= config.forcedLandingPct;

  // Política ante pérdida de enlace sostenida.
  let linkLossHover = false;
  if (linkLostFor >= config.linkLossDelayS) {
    if (config.linkLossAction === 'rth') rthActive = true;
    else if (config.linkLossAction === 'land') forced = true;
    else linkLossHover = true;
  }

  // Modo efectivo: sin GNSS no se puede mantener posición → ATTI.
  const desiredMode = input.mode ?? state.mode ?? 'GNSS';
  const mode = gnssOk ? desiredMode : 'ATTI';
  const p = modeParams(profile, mode);

  // Resolución del objetivo según quién manda (prioridad: forzado > RTH > pérdida de enlace > piloto).
  let target;
  let phase;
  let positionHold = p.positionHold;
  if (forced) {
    phase = 'forced_landing';
    target = descendTarget(p);
    positionHold = gnssOk; // si hay GNSS, desciende en el sitio; si no, puede derivar
  } else if (rthActive && gnssOk) {
    const r = rthTarget(state, { config, p });
    phase = r.phase;
    target = r.target;
    positionHold = true;
  } else if (rthActive && !gnssOk) {
    phase = 'rth_sin_gnss_estacionario'; // no puede navegar sin GNSS: aguanta en el sitio
    target = hoverTarget();
    positionHold = false;
  } else if (linkLossHover) {
    phase = 'enlace_perdido_estacionario';
    target = hoverTarget();
    positionHold = p.positionHold;
  } else {
    phase = 'manual';
    target = resolveStickTarget(input, state.heading, p);
  }

  const kin = integrate(state, target, p, dt, { wind, positionHold });
  const draw = powerDrawW(kin, { profile, wind });
  const battery = drainBattery(state.battery, draw, dt);

  return {
    ...kin,
    t: t + dt,
    mode,
    battery,
    rthActive: forced ? false : rthActive,
    forced,
    phase,
    batteryPct: batteryPercent(battery, profile),
    batteryState: batteryStatus(batteryPercent(battery, profile), config),
    linkLostSince,
    gnssOk,
    linkOk,
    windSpeed: wind.speed,
  };
}
