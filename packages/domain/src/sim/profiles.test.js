import { describe, it, expect } from 'vitest';
import { PROFILES, listProfiles, getProfile, validateProfile } from './profiles.js';

describe('perfiles de aeronave (datos oficiales DJI)', () => {
  it('los perfiles reales son válidos', () => {
    for (const p of listProfiles()) expect(validateProfile(p)).toBe(true);
  });

  it('están los dos perfiles de la decisión D-SIM-7', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(['dji-matrice-4', 'dji-mini-5-pro']);
  });

  it('getProfile devuelve el perfil y lanza si no existe', () => {
    expect(getProfile('dji-mini-5-pro').label).toBe('DJI Mini 5 Pro');
    expect(() => getProfile('no-existe')).toThrow();
  });

  it('cada perfil cita su fuente oficial de DJI (regla Q2)', () => {
    for (const p of listProfiles()) expect(p.source).toMatch(/dji\.com/);
  });

  it('NO inventa los datos que DJI no publica: no hay yaw ni desglose normal/deportivo', () => {
    for (const p of listProfiles()) {
      expect(p).not.toHaveProperty('yawRateDeg');
      expect(p).not.toHaveProperty('maxSpeedNormal');
      expect(p).not.toHaveProperty('maxSpeedSport');
      expect(p).not.toHaveProperty('enduranceHoverS');
    }
  });

  it('enduranceKind refleja el régimen real publicado por DJI', () => {
    expect(getProfile('dji-matrice-4').enduranceKind).toBe('hover'); // DJI publica estacionario
    expect(getProfile('dji-mini-5-pro').enduranceKind).toBe('forward'); // DJI solo publica vuelo frontal
  });

  it('validateProfile rechaza campos faltantes, no positivos o sin fuente', () => {
    expect(() => validateProfile({ id: 'x' })).toThrow();
    expect(() => validateProfile({ ...getProfile('dji-mini-5-pro'), source: undefined })).toThrow();
    expect(() => validateProfile({ ...getProfile('dji-mini-5-pro'), maxAscent: 0 })).toThrow();
    expect(() => validateProfile({ ...getProfile('dji-mini-5-pro'), capacityWh: -1 })).toThrow();
    expect(() => validateProfile({ ...getProfile('dji-mini-5-pro'), enduranceKind: 'x' })).toThrow();
  });
});
