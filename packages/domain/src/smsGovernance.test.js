import { describe, it, expect } from 'vitest';
import { validateGsoProfile, GSO_PROFILE_REQUIREMENTS } from './smsGovernance.js';

const fullProfile = {
  accreditedTraining: true,
  operationalExperienceRelevant: true,
  oneYearAviationAdminExperience: true,
  smsAdvancedCourseCertified: true,
  projectManagementTraining: true,
};

describe('validateGsoProfile', () => {
  it('acepta un perfil que cumple los 5 criterios', () => {
    expect(validateGsoProfile(fullProfile)).toEqual({ eligible: true, missing: [] });
  });

  it('rechaza si falta un criterio exclusivo de RAC 100 (no cubierto por MAUT)', () => {
    const result = validateGsoProfile({ ...fullProfile, oneYearAviationAdminExperience: false });
    expect(result.eligible).toBe(false);
    expect(result.missing.map((m) => m.key)).toContain('oneYearAviationAdminExperience');
  });

  it('rechaza si falta un criterio exclusivo de MAUT (no cubierto por RAC 100)', () => {
    const result = validateGsoProfile({ ...fullProfile, projectManagementTraining: false });
    expect(result.eligible).toBe(false);
    expect(result.missing.map((m) => m.key)).toContain('projectManagementTraining');
  });

  it('un perfil vacío reporta los 5 criterios faltantes', () => {
    const result = validateGsoProfile({});
    expect(result.eligible).toBe(false);
    expect(result.missing).toHaveLength(GSO_PROFILE_REQUIREMENTS.length);
  });
});
