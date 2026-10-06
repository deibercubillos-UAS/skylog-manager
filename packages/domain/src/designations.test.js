import { describe, it, expect } from 'vitest';
import { validateDesignationInput, DESIGNATION_ROLES } from './designations.js';

const ok = { roleType: 'jefe_pilotos', personId: 'p1', actReference: 'Acta 003', actDate: '2026-10-01', today: '2026-10-06' };

describe('validateDesignationInput', () => {
  it('válida', () => expect(validateDesignationInput(ok).ok).toBe(true));
  it('el GSO no se designa aquí', () => expect(validateDesignationInput({ ...ok, roleType: 'gerente_sms' }).ok).toBe(false));
  it('exige persona, acta y fecha', () => {
    expect(validateDesignationInput({ ...ok, personId: '' }).ok).toBe(false);
    expect(validateDesignationInput({ ...ok, actReference: ' ' }).ok).toBe(false);
    expect(validateDesignationInput({ ...ok, actDate: '' }).ok).toBe(false);
  });
  it('fecha futura no vale; hoy sí', () => {
    expect(validateDesignationInput({ ...ok, actDate: '2026-10-07' }).ok).toBe(false);
    expect(validateDesignationInput({ ...ok, actDate: '2026-10-06' }).ok).toBe(true);
  });
  it('tres cargos', () => expect(DESIGNATION_ROLES).toHaveLength(3));
});
