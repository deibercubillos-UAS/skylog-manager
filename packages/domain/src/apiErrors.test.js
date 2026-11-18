import { describe, it, expect } from 'vitest';
import { describeDbError, GENERIC_ERROR_MESSAGE } from './apiErrors.js';

describe('describeDbError', () => {
  it('un raise exception propio (P0001) pasa como mensaje de negocio', () => {
    expect(describeDbError({ code: 'P0001', message: 'Solo el Gerente General puede cambiar las horas' })).toEqual({ status: 400, message: 'Solo el Gerente General puede cambiar las horas' });
  });
  it('las reglas de evidencia inmutable (23001) también pasan como mensaje de negocio', () => {
    expect(describeDbError({ code: '23001', message: 'Este despacho ya está cerrado y no admite cambios.' })).toEqual({ status: 400, message: 'Este despacho ya está cerrado y no admite cambios.' });
  });
  it('traduce los códigos conocidos sin filtrar nombres internos', () => {
    const r = describeDbError({ code: '23505', message: 'duplicate key value violates unique constraint "flights_pkey"' });
    expect(r.status).toBe(409);
    expect(r.message).not.toMatch(/flights|constraint|duplicate/i);
    expect(describeDbError({ code: '42501', message: 'new row violates row-level security policy for table "flights"' })).toMatchObject({ status: 403 });
    expect(describeDbError({ code: '23503', message: 'x' }).status).toBe(409);
    expect(describeDbError({ code: 'PGRST116', message: 'x' }).status).toBe(404);
  });
  it('cualquier otro error: mensaje genérico, sin el texto original', () => {
    const r = describeDbError({ code: '42P01', message: 'relation "secret_table" does not exist' });
    expect(r).toEqual({ status: 500, message: GENERIC_ERROR_MESSAGE });
    expect(describeDbError({ message: 'fetch failed' }).message).toBe(GENERIC_ERROR_MESSAGE);
    expect(describeDbError(null).status).toBe(500);
  });
  it('respeta el estado por defecto indicado', () => {
    expect(describeDbError({ code: 'XX000', message: 'x' }, 502).status).toBe(502);
  });
});
