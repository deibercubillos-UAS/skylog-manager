import { describe, it, expect } from 'vitest';
import { resolveOrganizationSmsProfile } from './organizationSmsProfile.js';

describe('resolveOrganizationSmsProfile', () => {
  it('0 aeronaves — puede combinar JP y GSO', () => {
    expect(resolveOrganizationSmsProfile({ aircraftCount: 0 }).canCombineJpAndGso).toBe(true);
  });

  it('exactamente 2 aeronaves — todavía puede combinar (umbral inclusivo, §100.545(a))', () => {
    expect(resolveOrganizationSmsProfile({ aircraftCount: 2 }).canCombineJpAndGso).toBe(true);
  });

  it('3 aeronaves — ya no puede combinar', () => {
    expect(resolveOrganizationSmsProfile({ aircraftCount: 3 }).canCombineJpAndGso).toBe(false);
  });

  it('sin aircraftCount — default 0, combinable', () => {
    expect(resolveOrganizationSmsProfile().canCombineJpAndGso).toBe(true);
  });

  it('la nota cambia de redacción según el umbral', () => {
    expect(resolveOrganizationSmsProfile({ aircraftCount: 1 }).note).toMatch(/puede ejercer/);
    expect(resolveOrganizationSmsProfile({ aircraftCount: 5 }).note).toMatch(/exige separar/);
  });
});
