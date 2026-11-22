import { describe, it, expect } from 'vitest';
import { getProfile } from './profiles.js';
import { createInitialState, advance } from './engine.js';
import { calmEnvironment, createEnvironment } from './environment.js';

const P = getProfile('dji-mini-5-pro');

function run(state, inputs, ctx) {
  let s = state;
  for (const input of inputs) s = advance(s, input, ctx);
  return s;
}

describe('motor — Retorno a Casa (RTH)', () => {
  it('RTH manual: sube, vuelve a casa y aterriza', () => {
    const ctx = { profile: P, environment: calmEnvironment(), config: {}, dt: 0.2 };
    const s0 = { ...createInitialState(P, { z: 10 }), x: 150, y: 0 };
    const inputs = [{ engageRth: true }, ...Array.from({ length: 700 }, () => ({}))];
    const s = run(s0, inputs, ctx);
    expect(Math.hypot(s.x, s.y)).toBeLessThan(8);
    expect(s.landed).toBe(true);
  });

  it('batería baja dispara el RTH automático', () => {
    const ctx = { profile: P, environment: calmEnvironment(), config: {}, dt: 1 };
    const s0 = { ...createInitialState(P, { z: 30, batteryFraction: 0.15 }), x: 50, y: 0 };
    const s = advance(s0, {}, ctx);
    expect(s.rthActive).toBe(true);
    expect(s.phase.startsWith('rth')).toBe(true);
  });
});

describe('motor — aterrizaje forzado por batería crítica', () => {
  it('por debajo del umbral fuerza el descenso hasta aterrizar', () => {
    const ctx = { profile: P, environment: calmEnvironment(), config: {}, dt: 0.5 };
    const s0 = { ...createInitialState(P, { z: 30, batteryFraction: 0.04 }), x: 10, y: 0 };
    const one = advance(s0, {}, ctx);
    expect(one.forced).toBe(true);
    expect(one.phase).toBe('forced_landing');
    const s = run(s0, Array.from({ length: 120 }, () => ({})), ctx);
    expect(s.landed).toBe(true);
  });
});

describe('motor — pérdida de enlace C2', () => {
  it('con la política por defecto (rth) y el retardo cumplido, activa el RTH', () => {
    const env = createEnvironment({ events: [{ at: 0, type: 'c2_loss' }] });
    const ctx = { profile: P, environment: env, config: { linkLossDelayS: 3 }, dt: 1 };
    const s0 = { ...createInitialState(P, { z: 30 }), x: 60, y: 0 };
    const s = run(s0, Array.from({ length: 6 }, () => ({})), ctx);
    expect(s.rthActive).toBe(true);
    expect(s.phase.startsWith('rth')).toBe(true);
  });
});

describe('motor — pérdida de GNSS fuerza ATTI y deja derivar', () => {
  it('sin GNSS el modo efectivo es ATTI y el viento arrastra la aeronave', () => {
    const env = createEnvironment({ wind: { speed: 5, directionDeg: 90 }, events: [{ at: 0, type: 'gnss_loss' }] });
    const ctx = { profile: P, environment: env, config: {}, dt: 0.1 };
    const s0 = { ...createInitialState(P, { z: 30 }) };
    const s = run(s0, Array.from({ length: 200 }, () => ({ mode: 'GNSS' })), ctx); // 20 s
    expect(s.mode).toBe('ATTI');
    expect(s.x).toBeGreaterThan(30);
  });
});
