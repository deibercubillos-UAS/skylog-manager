import { describe, it, expect } from 'vitest';
import { createEnvironment, calmEnvironment } from './environment.js';

describe('entorno — determinismo y viento', () => {
  it('la misma semilla y el mismo t dan el mismo viento', () => {
    const a = createEnvironment({ wind: { speed: 5, gust: 3 }, seed: 'abc' });
    const b = createEnvironment({ wind: { speed: 5, gust: 3 }, seed: 'abc' });
    for (const t of [0, 1.5, 7.3, 42]) expect(a.windAt(t)).toEqual(b.windAt(t));
  });

  it('las ráfagas quedan acotadas por la amplitud configurada', () => {
    const env = createEnvironment({ wind: { speed: 5, gust: 3 }, seed: 'x' });
    for (let t = 0; t < 60; t += 0.5) {
      expect(env.windAt(t).speed).toBeGreaterThanOrEqual(0);
      expect(env.windAt(t).speed).toBeLessThanOrEqual(5 + 3 + 1e-9);
    }
  });

  it('dirección: 90° sopla hacia el este (+x)', () => {
    const env = createEnvironment({ wind: { speed: 4, directionDeg: 90 } });
    const w = env.windAt(0);
    expect(w.x).toBeCloseTo(4, 6);
    expect(Math.abs(w.y)).toBeLessThan(1e-9);
  });

  it('calma: viento cero en todo momento', () => {
    const env = calmEnvironment();
    expect(env.windAt(10).speed).toBe(0);
  });

  it('eventos: pérdida de GNSS y de enlace C2 en su ventana', () => {
    const env = createEnvironment({
      events: [
        { at: 5, until: 10, type: 'gnss_loss' },
        { at: 8, type: 'c2_loss' },
      ],
    });
    expect(env.gnssAt(3).ok).toBe(true);
    expect(env.gnssAt(7).ok).toBe(false);
    expect(env.gnssAt(12).ok).toBe(true);
    expect(env.linkAt(6).ok).toBe(true);
    expect(env.linkAt(20).ok).toBe(false); // sin `until` → persiste
  });
});
