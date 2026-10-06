import { describe, it, expect } from 'vitest';
import { PILOT_ADDITIONS, impliedAdditions, normalizeRequiredAdditions, evaluatePicQualifications, qualificationMessages } from './pilotQualifications.js';

describe('adiciones requeridas', () => {
  it('BVLOS implica la adición BVLOS', () => {
    expect(impliedAdditions({ lineOfSight: 'BVLOS' })).toEqual(['BVLOS']);
    expect(impliedAdditions({ lineOfSight: 'VLOS' })).toEqual([]);
  });
  it('normaliza: une, filtra al catálogo, sin repetir', () => {
    expect(normalizeRequiredAdditions(['ASPERSIÓN', 'ASPERSIÓN', 'INVENTADA'], { lineOfSight: 'BVLOS' })).toEqual(['ASPERSIÓN', 'BVLOS']);
    expect(PILOT_ADDITIONS).toContain('VUELO NOCTURNO');
  });
});

describe('evaluatePicQualifications', () => {
  const base = { licenseNumber: 'CIPU-1', missionDay: '2026-11-10' };
  it('cumple', () => {
    const r = evaluatePicQualifications({ ...base, additions: [{ addition: 'BVLOS', valid_until: null }], required: ['BVLOS'] });
    expect(r.ok).toBe(true);
  });
  it('sin exigencias y con licencia: ok', () => {
    expect(evaluatePicQualifications({ ...base, additions: [], required: [] }).ok).toBe(true);
  });
  it('sin licencia', () => {
    const r = evaluatePicQualifications({ licenseNumber: ' ', additions: [], required: [], missionDay: '2026-11-10' });
    expect(r.noLicense).toBe(true);
    expect(r.ok).toBe(false);
  });
  it('falta una adición', () => {
    const r = evaluatePicQualifications({ ...base, additions: [], required: ['BVLOS'] });
    expect(r.missing).toEqual(['BVLOS']);
  });
  it('vencida antes del día de la misión; el último día de vigencia sirve', () => {
    expect(evaluatePicQualifications({ ...base, additions: [{ addition: 'BVLOS', valid_until: '2026-11-09' }], required: ['BVLOS'] }).expired).toHaveLength(1);
    expect(evaluatePicQualifications({ ...base, additions: [{ addition: 'BVLOS', valid_until: '2026-11-10' }], required: ['BVLOS'] }).ok).toBe(true);
  });
  it('mensajes', () => {
    const r = evaluatePicQualifications({ licenseNumber: '', additions: [{ addition: 'ASPERSIÓN', valid_until: '2026-01-01' }], required: ['ASPERSIÓN', 'BVLOS'], missionDay: '2026-11-10' });
    expect(qualificationMessages(r)).toHaveLength(3);
  });
});
