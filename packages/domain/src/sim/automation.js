// Automatismos (entregable 1.4): Retorno a Casa (RTH) y reacción ante la pérdida del enlace C2.
// Estos ayudantes solo CALCULAN la velocidad objetivo del autopiloto; el motor (engine.js) decide
// cuándo se activan y los integra con el mismo modelo de vuelo que el pilotaje manual.
//
// El RTH navega apuntando a una velocidad SOBRE EL SUELO hacia casa (necesita GNSS). Sin GNSS no
// puede navegar: el motor lo degrada a estacionario (documentado allí).

/** Objetivo de velocidad para mantener el estacionario (todo en cero). */
export function hoverTarget() {
  return { tgx: 0, tgy: 0, tgz: 0, headingRate: 0 };
}

/** Objetivo de descenso controlado (aterrizaje forzado por batería o por política de enlace). */
export function descendTarget(p) {
  return { tgx: 0, tgy: 0, tgz: -Math.min(p.maxDescent, 2), headingRate: 0 };
}

/**
 * Calcula la fase y el objetivo del RTH según la posición actual.
 * Fases: sube a la altura de retorno → crucero hacia casa → desciende sobre casa.
 */
export function rthTarget(state, { config, p }) {
  const rthAlt = config.rthAltitudeM ?? 40;
  const home = config.home ?? { x: 0, y: 0 };
  const cruise = Math.min(config.cruiseSpeed ?? p.maxH, p.maxH);
  const dx = home.x - state.x;
  const dy = home.y - state.y;
  const dist = Math.hypot(dx, dy);

  if (state.z < rthAlt - 0.5 && dist > 3) {
    return { phase: 'rth_climb', target: { tgx: 0, tgy: 0, tgz: p.maxAscent, headingRate: 0 } };
  }
  if (dist > 2) {
    const ux = dx / dist;
    const uy = dy / dist;
    // Frena al acercarse a casa para no pasarse: velocidad ≤ distancia restante por segundo.
    const sp = Math.min(cruise, Math.max(1, dist));
    return { phase: 'rth_cruise', target: { tgx: ux * sp, tgy: uy * sp, tgz: 0, headingRate: 0 } };
  }
  return { phase: 'rth_descend', target: descendTarget(p) };
}
