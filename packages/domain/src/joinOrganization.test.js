import { describe, it, expect } from 'vitest';
import { evaluateJoin, validateJoinRegistration, JOINABLE_ROLES } from './joinOrganization.js';

describe('evaluateJoin', () => {
  it('rol inválido (el Gerente General no se pide)', () => {
    expect(evaluateJoin({ role: 'admin' }).reason).toBe('rol_invalido');
    expect(evaluateJoin({ role: 'superadmin' }).ok).toBe(false);
  });
  it('un piloto entra si hay cupo', () => expect(evaluateJoin({ role: 'piloto', members: [{ role: 'piloto' }], crewLimit: 5, crewCount: 1 }).ok).toBe(true));
  it('cargos únicos ocupados', () => {
    const r = evaluateJoin({ role: 'jefe_pilotos', members: [{ role: 'admin' }, { role: 'jefe_pilotos' }] });
    expect(r.reason).toBe('rol_ocupado');
    expect(r.message).toMatch(/Jefe de Pilotos/);
    expect(evaluateJoin({ role: 'gerente_sms', members: [{ role: 'jefe_pilotos' }] }).ok).toBe(true);
  });
  it('el piloto no tiene cupo único: varios pilotos pueden entrar', () => expect(evaluateJoin({ role: 'piloto', members: [{ role: 'piloto' }, { role: 'piloto' }] }).ok).toBe(true));
  it('límite del plan', () => {
    expect(evaluateJoin({ role: 'piloto', crewLimit: 1, crewCount: 1 }).reason).toBe('limite_plan');
    expect(evaluateJoin({ role: 'piloto', crewLimit: 1, crewCount: 0 }).ok).toBe(true);
    expect(evaluateJoin({ role: 'piloto', crewLimit: null, crewCount: 999 }).ok).toBe(true);
  });
  it('el límite también aplica a los cargos únicos', () => expect(evaluateJoin({ role: 'jefe_pilotos', crewLimit: 1, crewCount: 1 }).reason).toBe('limite_plan'));
  it('roles disponibles', () => expect(JOINABLE_ROLES).toEqual(['piloto', 'jefe_pilotos', 'gerente_sms']));
});

const ok = { firstName: 'Luis', lastName: 'Gómez', email: 'LUIS@x.co', password: 'clave1234', nit: '900.123.456-7', role: 'piloto', acceptedTerms: true };
describe('validateJoinRegistration', () => {
  it('válido y normaliza', () => {
    const r = validateJoinRegistration(ok);
    expect(r.ok).toBe(true);
    expect(r.clean).toMatchObject({ email: 'luis@x.co', nit: '9001234567', role: 'piloto', fullName: 'Luis Gómez' });
  });
  it.each([[{ role: 'admin' }], [{ nit: '1' }], [{ password: 'corta' }], [{ acceptedTerms: false }], [{ email: 'mal' }]])('rechaza %j', (patch) => {
    expect(validateJoinRegistration({ ...ok, ...patch }).ok).toBe(false);
  });
});
