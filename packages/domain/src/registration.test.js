import { describe, it, expect } from 'vitest';
import { normalizeNit, passwordProblem, validateRegistration, trialEndsAt } from './registration.js';

const ok = { firstName: 'Ana', lastName: 'Pérez', email: ' Ana@Empresa.CO ', password: 'clave1234', companyName: 'Drones SAS', nit: '900.123.456-7', phone: '+57 300 123 4567', acceptedTerms: true };

describe('normalizeNit', () => {
  it('quita espacios, guiones y puntos; mayúsculas', () => expect(normalizeNit(' 900.123.456-7 ')).toBe('9001234567'));
  it('vacío', () => expect(normalizeNit(null)).toBe(''));
});

describe('passwordProblem', () => {
  it('corta, sin número, sin letra', () => {
    expect(passwordProblem('abc123')).toMatch(/8 caracteres/);
    expect(passwordProblem('soloLetrasAqui')).toMatch(/letras y números/);
    expect(passwordProblem('1234567890')).toMatch(/letras y números/);
  });
  it('válida', () => expect(passwordProblem('clave1234')).toBeNull());
});

describe('validateRegistration', () => {
  it('válido: normaliza correo y NIT y arma el nombre', () => {
    const r = validateRegistration(ok);
    expect(r.ok).toBe(true);
    expect(r.clean).toMatchObject({ email: 'ana@empresa.co', nit: '9001234567', fullName: 'Ana Pérez', companyName: 'Drones SAS' });
  });
  it.each([
    [{ firstName: 'A' }, 'nombre'],
    [{ email: 'sin-arroba' }, 'correo'],
    [{ password: 'corta1' }, 'contraseña'],
    [{ companyName: '' }, 'empresa'],
    [{ nit: '12' }, 'NIT'],
    [{ phone: 'abc' }, 'teléfono'],
    [{ acceptedTerms: false }, 'términos'],
  ])('rechaza %j (%s)', (patch) => expect(validateRegistration({ ...ok, ...patch }).ok).toBe(false));
  it('el teléfono es opcional', () => expect(validateRegistration({ ...ok, phone: '' }).ok).toBe(true));
  it('acumula varios errores', () => expect(validateRegistration({}).errors.length).toBeGreaterThanOrEqual(5));
});

describe('trialEndsAt', () => {
  it('suma días', () => expect(trialEndsAt('2026-10-06T12:00:00.000Z', 15)).toBe('2026-10-21T12:00:00.000Z'));
});
