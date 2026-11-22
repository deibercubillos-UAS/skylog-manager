// Batería (entregable 1.3): consumo según régimen y viento, umbrales configurables y aterrizaje
// forzado. La potencia base se DERIVA del perfil (capacidad ÷ autonomía publicada), así que un
// vuelo sin carga ni viento agota la batería en `enduranceS` (± error de integración). Volar
// rápido, subir o pelear viento la agotan antes. OJO al régimen de `enduranceKind`: para el Mini 5
// Pro DJI publica autonomía en vuelo frontal, no en estacionario (ver profiles.js).

/** Potencia (W) base sin viento, coherente con la autonomía publicada del perfil. */
export function hoverPowerW(profile) {
  return (profile.capacityWh / profile.enduranceS) * 3600;
}

// Factores de carga (adimensionales). Calibrados para que el estacionario sea 1,0 y la carga
// crezca de forma monótona con velocidad, ascenso y viento.
const K_SPEED = 0.6;
const K_CLIMB = 1.2;
const K_WIND = 0.4;

/** Potencia instantánea (W) para un estado cinemático y un viento dados. */
export function powerDrawW(state, { profile, wind }) {
  const hp = hoverPowerW(profile);
  const speed = Math.hypot(state.vx, state.vy);
  const climb = Math.max(0, state.vz);
  const windSpeed = wind?.speed ?? 0;
  const f =
    1 +
    K_SPEED * (speed / profile.maxSpeedMs) +
    K_CLIMB * (climb / profile.maxAscent) +
    K_WIND * (windSpeed / Math.max(1, profile.maxWind));
  return hp * f;
}

/** Descuenta energía por un paso `dt`. Nunca baja de 0. */
export function drainBattery(battery, drawW, dt) {
  return { energyWh: Math.max(0, battery.energyWh - (drawW * dt) / 3600) };
}

/** Porcentaje de batería (0–100) respecto a la capacidad del perfil. */
export function batteryPercent(battery, profile) {
  return (battery.energyWh / profile.capacityWh) * 100;
}

/** Estado de batería según los umbrales configurables. */
export function batteryStatus(pct, config = {}) {
  if (pct <= (config.forcedLandingPct ?? 5)) return 'forced_landing';
  if (pct <= (config.rthBatteryPct ?? 20)) return 'rth';
  if (pct <= (config.warnPct ?? 30)) return 'warn';
  return 'ok';
}
