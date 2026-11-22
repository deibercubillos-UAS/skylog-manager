import { describe, it, expect } from 'vitest';
import { listProfiles, getProfile } from './profiles.js';
import { hoverPowerW, powerDrawW, drainBattery, batteryPercent, batteryStatus } from './battery.js';
import { createInitialState, advance } from './engine.js';
import { calmEnvironment, createEnvironment } from './environment.js';

/** Mide, simulando, cuántos segundos aguanta en estacionario a una altura fija. */
function measureHoverEndurance(profile, environment, dt = 2) {
  let s = { ...createInitialState(profile, { z: 50 }) };
  const ctx = { profile, environment, config: {}, dt };
  let t = 0;
  const maxT = profile.enduranceS * 2;
  while (batteryPercent(s.battery, profile) > 0.1 && t < maxT) {
    s = advance(s, {}, ctx);
    t += dt;
  }
  return t;
}

describe('batería — autonomía', () => {
  it('cada perfil agota la batería dentro de ±10 % de la autonomía publicada', () => {
    for (const p of listProfiles()) {
      const measured = measureHoverEndurance(p, calmEnvironment());
      const rel = Math.abs(measured - p.enduranceS) / p.enduranceS;
      expect(rel).toBeLessThan(0.1);
    }
  });

  it('con viento la autonomía es menor que en calma', () => {
    const p = getProfile('dji-matrice-4');
    const calm = measureHoverEndurance(p, calmEnvironment());
    const windy = measureHoverEndurance(p, createEnvironment({ wind: { speed: 10 } }));
    expect(windy).toBeLessThan(calm);
  });
});

describe('batería — potencia y umbrales', () => {
  const p = getProfile('dji-mini-5-pro');

  it('el estacionario consume exactamente la potencia base del perfil', () => {
    const draw = powerDrawW({ vx: 0, vy: 0, vz: 0 }, { profile: p, wind: { speed: 0 } });
    expect(draw).toBeCloseTo(hoverPowerW(p), 6);
  });

  it('volar rápido, subir o pelear viento consume más que el estacionario', () => {
    const base = hoverPowerW(p);
    expect(powerDrawW({ vx: p.maxSpeedMs, vy: 0, vz: 0 }, { profile: p, wind: { speed: 0 } })).toBeGreaterThan(base);
    expect(powerDrawW({ vx: 0, vy: 0, vz: p.maxAscent }, { profile: p, wind: { speed: 0 } })).toBeGreaterThan(base);
    expect(powerDrawW({ vx: 0, vy: 0, vz: 0 }, { profile: p, wind: { speed: 8 } })).toBeGreaterThan(base);
  });

  it('drainBattery nunca baja de 0', () => {
    expect(drainBattery({ energyWh: 1 }, 100000, 1).energyWh).toBe(0);
  });

  it('batteryStatus respeta los umbrales configurables', () => {
    const cfg = { warnPct: 30, rthBatteryPct: 20, forcedLandingPct: 5 };
    expect(batteryStatus(100, cfg)).toBe('ok');
    expect(batteryStatus(25, cfg)).toBe('warn');
    expect(batteryStatus(15, cfg)).toBe('rth');
    expect(batteryStatus(3, cfg)).toBe('forced_landing');
  });
});
