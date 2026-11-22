// Utilidades matemáticas puras del simulador. Sin dependencias, sin estado.
// Ver docs/skylog-v2/45-simulador-3d-plan.md (Fase 1) y 33-arquitectura.md.

/** Acota un valor al rango [lo, hi]. */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Mueve `cur` hacia `target` a lo sumo `maxDelta` (aproximación de primer orden, paso fijo). */
export function approach(cur, target, maxDelta) {
  const d = target - cur;
  if (Math.abs(d) <= maxDelta) return target;
  return cur + Math.sign(d) * maxDelta;
}

/** Normaliza un ángulo (rad) al rango (-π, π]. */
export function wrapAngle(a) {
  const twoPi = Math.PI * 2;
  a %= twoPi;
  if (a <= -Math.PI) a += twoPi;
  if (a > Math.PI) a -= twoPi;
  return a;
}

export const hypot = (x, y) => Math.hypot(x, y);
export const DEG = Math.PI / 180;
