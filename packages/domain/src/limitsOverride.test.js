import { describe, it, expect } from 'vitest';
import { effectiveLimits, normalizeLimitsOverride } from './limitsOverride.js';

const escuadrilla = { aircraft: 3, pilots: 5, batteries: null };

describe('límites ajustados por organización', () => {
  it('sin ajuste rigen los del plan', () => {
    expect(effectiveLimits(escuadrilla, null)).toEqual(escuadrilla);
    expect(effectiveLimits(escuadrilla, {})).toEqual(escuadrilla);
  });
  it('un número reemplaza el límite y null lo deja ilimitado', () => {
    expect(effectiveLimits(escuadrilla, { pilots: 8, aircraft: null })).toEqual({ aircraft: null, pilots: 8, batteries: null });
  });
  it('también puede bajar el límite (incluso a 0)', () => {
    expect(effectiveLimits(escuadrilla, { aircraft: 0 }).aircraft).toBe(0);
  });
  it('un valor inválido guardado se ignora', () => {
    expect(effectiveLimits(escuadrilla, { pilots: -1, aircraft: '9', batteries: 2.5 })).toEqual(escuadrilla);
  });
  it('no modifica el objeto del plan', () => {
    effectiveLimits(escuadrilla, { pilots: 99 });
    expect(escuadrilla.pilots).toBe(5);
  });
});

describe('validación del ajuste enviado por el panel', () => {
  it('acepta números, ilimitado y vacío', () => {
    expect(normalizeLimitsOverride({ pilots: 8, aircraft: null })).toEqual({ value: { pilots: 8, aircraft: null } });
    expect(normalizeLimitsOverride({})).toEqual({ value: null });
    expect(normalizeLimitsOverride(null)).toEqual({ value: null });
  });
  it('rechaza llaves desconocidas y valores no enteros', () => {
    expect(normalizeLimitsOverride({ drones: 3 }).error).toBeTruthy();
    expect(normalizeLimitsOverride({ pilots: '8' }).error).toBeTruthy();
    expect(normalizeLimitsOverride({ pilots: -2 }).error).toBeTruthy();
    expect(normalizeLimitsOverride({ pilots: 1.5 }).error).toBeTruthy();
    expect(normalizeLimitsOverride([1]).error).toBeTruthy();
  });
});
