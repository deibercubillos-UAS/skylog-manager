import { describe, it, expect } from 'vitest';
import { resolveDefaultWorkspace, WORKSPACES } from './workspaces.js';

describe('resolveDefaultWorkspace', () => {
  it('piloto aterriza en OPERAR', () => {
    expect(resolveDefaultWorkspace('piloto')).toBe('operar');
  });

  it('jefe_pilotos aterriza en PLANEAR', () => {
    expect(resolveDefaultWorkspace('jefe_pilotos')).toBe('planear');
  });

  it('gerente_sms aterriza en CUMPLIR', () => {
    expect(resolveDefaultWorkspace('gerente_sms')).toBe('cumplir');
  });

  it('un rol desconocido cae a OPERAR por defecto', () => {
    expect(resolveDefaultWorkspace('rol_inexistente')).toBe('operar');
  });
});

describe('WORKSPACES', () => {
  it('define los 4 espacios reales', () => {
    expect(WORKSPACES.map((w) => w.key)).toEqual(['operar', 'planear', 'registrar', 'cumplir']);
  });
});
