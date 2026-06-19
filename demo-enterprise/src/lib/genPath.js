// Genera una trayectoria GPS determinista para un vuelo (patrón de barrido tipo
// "lawnmower", típico de inspección/topografía). Sin mapas externos: produce
// puntos normalizados (0..1) que el visor SVG dibuja y anima.

function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Retorna un array de puntos { x, y, alt } (x,y en 0..1; alt en metros aprox).
export function genPath(flight) {
  const rng = seeded(flight?.id || 'flt');
  const lanes = 4 + Math.floor(rng() * 3);       // 4–6 pasadas
  const perLane = 14;
  const x0 = 0.12, x1 = 0.88;
  const y0 = 0.15, y1 = 0.85;
  const cruise = flight?.maxAlt || 110;
  const pts = [];

  for (let l = 0; l < lanes; l++) {
    const y = y0 + (l / (lanes - 1)) * (y1 - y0);
    for (let i = 0; i < perLane; i++) {
      const tt = i / (perLane - 1);
      const xRaw = l % 2 === 0 ? tt : 1 - tt;      // zig-zag
      const x = x0 + xRaw * (x1 - x0) + (rng() - 0.5) * 0.015;
      const jY = y + (rng() - 0.5) * 0.02;
      // altitud: sube al inicio, crucero, leve variación
      const global = (l * perLane + i) / (lanes * perLane);
      let alt;
      if (global < 0.08) alt = cruise * (global / 0.08);
      else if (global > 0.94) alt = cruise * (1 - (global - 0.94) / 0.06);
      else alt = cruise + Math.sin(global * 18) * (cruise * 0.06);
      pts.push({ x, y: jY, alt: Math.max(0, Math.round(alt)) });
    }
  }
  return pts;
}
