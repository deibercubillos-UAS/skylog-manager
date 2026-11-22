import { describe, it, expect } from 'vitest';
import { getProfile } from './profiles.js';
import { createEnvironment } from './environment.js';
import { runSimulation, replaySimulation, constantInputs } from './replay.js';

const P = getProfile('dji-matrice-4');

// Entradas variadas: subir y avanzar un rato, girar, luego soltar.
function scriptedInputs() {
  const inputs = [];
  for (let i = 0; i < 100; i++) inputs.push({ throttle: 0.6, pitch: 0.4 });
  for (let i = 0; i < 100; i++) inputs.push({ pitch: 0.8, yaw: 0.3, mode: 'SPORT' });
  for (let i = 0; i < 100; i++) inputs.push({});
  return inputs;
}

describe('repetición determinista (requisito 1.5)', () => {
  it('misma semilla + mismas entradas = mismo estado final', () => {
    const recipe = () => ({
      profile: P,
      environment: createEnvironment({ wind: { speed: 4, gust: 2, directionDeg: 45 }, seed: 'run-7' }),
      inputs: scriptedInputs(),
      config: { batteryFraction: 1 },
      dt: 0.05,
    });
    const a = runSimulation(recipe()).finalState;
    const b = runSimulation(recipe()).finalState;
    expect(a).toEqual(b);
  });

  it('replaySimulation reproduce el mismo estado final que la corrida original', () => {
    const recording = {
      profile: P,
      environment: createEnvironment({ wind: { speed: 4, gust: 2, directionDeg: 45 }, seed: 'run-7' }),
      inputs: scriptedInputs(),
      config: { batteryFraction: 1 },
      dt: 0.05,
    };
    const original = runSimulation(recording).finalState;
    expect(replaySimulation(recording)).toEqual(original);
  });

  it('otra semilla de viento cambia el resultado', () => {
    const base = {
      profile: P,
      inputs: scriptedInputs(),
      config: { batteryFraction: 1 },
      dt: 0.05,
    };
    const a = runSimulation({ ...base, environment: createEnvironment({ wind: { speed: 4, gust: 3 }, seed: 'A' }) }).finalState;
    const b = runSimulation({ ...base, environment: createEnvironment({ wind: { speed: 4, gust: 3 }, seed: 'B' }) }).finalState;
    expect(a).not.toEqual(b);
  });

  it('constantInputs genera la cantidad pedida', () => {
    expect(constantInputs(5, { throttle: 1 })).toHaveLength(5);
  });

  it('keepTrace guarda el estado de cada paso para el debriefing', () => {
    const r = runSimulation({
      profile: P,
      environment: createEnvironment({ seed: 'x' }),
      inputs: constantInputs(10, { throttle: 0.5 }),
      keepTrace: true,
    });
    expect(r.trace).toHaveLength(11); // estado inicial + 10 pasos
    expect(r.steps).toBe(10);
  });
});
