import { describe, it, expect } from 'vitest';
import { getProfile } from './profiles.js';
import { stepFlight, modeParams } from './flightModel.js';

const P = getProfile('dji-mini-5-pro');
const NOWIND = { x: 0, y: 0, speed: 0 };

function fly(state, input, mode, wind, steps, dt) {
  let s = state;
  for (let i = 0; i < steps; i++) s = { ...s, ...stepFlight(s, input, { profile: P, mode, wind, dt }) };
  return s;
}

const hover = (z = 20) => ({ x: 0, y: 0, z, vx: 0, vy: 0, vz: 0, heading: 0, landed: false });

describe('modelo de vuelo — palancas', () => {
  it('pitch adelante mueve al norte (+y); roll derecha mueve al este (+x)', () => {
    const north = fly(hover(), { pitch: 1 }, 'GNSS', NOWIND, 40, 0.05);
    expect(north.y).toBeGreaterThan(1);
    expect(Math.abs(north.x)).toBeLessThan(0.01);
    const east = fly(hover(), { roll: 1 }, 'GNSS', NOWIND, 40, 0.05);
    expect(east.x).toBeGreaterThan(1);
    expect(Math.abs(east.y)).toBeLessThan(0.01);
  });

  it('el modo deportivo alcanza más velocidad que el normal', () => {
    expect(modeParams(P, 'SPORT').maxH).toBeGreaterThan(modeParams(P, 'GNSS').maxH);
  });
});

describe('modelo de vuelo — GNSS mantiene posición, ATTI deriva (mismo viento)', () => {
  const WIND_E = { x: 5, y: 0, speed: 5 }; // 5 m/s hacia el este

  it('GNSS: palancas al centro con viento → frena y aguanta el punto', () => {
    const s = fly(hover(), {}, 'GNSS', WIND_E, 400, 0.05); // 20 s
    expect(Math.hypot(s.x, s.y)).toBeLessThan(0.5);
  });

  it('ATTI: palancas al centro con el mismo viento → el viento lo arrastra', () => {
    const s = fly(hover(), {}, 'ATTI', WIND_E, 400, 0.05); // 20 s
    expect(s.x).toBeGreaterThan(50);
    expect(Math.abs(s.x - 5 * 20)).toBeLessThan(10); // deriva ≈ viento × tiempo
  });
});
