// Generador pseudoaleatorio DETERMINISTA para el simulador. La misma semilla produce
// siempre la misma secuencia, en cualquier máquina: es la base del requisito 1.5 del plan
// (misma semilla + mismas entradas = mismo resultado) y de la repetición 3D para el debriefing.
// No se usa Math.random() en ninguna parte del motor.

/** Convierte una semilla (texto o número) en un entero de 32 bits sin signo (FNV-1a). */
export function hashSeed(seed) {
  let h = 2166136261 >>> 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** PRNG mulberry32: rápido, determinista, uniforme en [0, 1). Devuelve una función generadora. */
export function mulberry32(seed) {
  let a = hashSeed(seed);
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
