import { describe, it, expect } from 'vitest';
import { addYears, retentionExpiry, isWithinRetention, canReleaseHold, holdStatus, RETAINED_RECORD_TYPES, RETENTION_YEARS } from './retentionPolicy.js';

describe('addYears / retentionExpiry', () => {
  it('suma 5 años exactos', () => {
    expect(retentionExpiry('2026-10-05')).toBe('2031-10-05');
  });
  it('acepta timestamps ISO y toma solo la fecha', () => {
    expect(retentionExpiry('2026-10-05T23:30:00-05:00')).toBe('2031-10-05');
  });
  it('29 de febrero cae al 28 cuando el año destino no es bisiesto', () => {
    expect(addYears('2024-02-29', 5)).toBe('2029-02-28');
  });
  it('29 de febrero se conserva si el año destino es bisiesto', () => {
    expect(addYears('2024-02-29', 4)).toBe('2028-02-29');
  });
  it('fin de año', () => {
    expect(retentionExpiry('2026-12-31')).toBe('2031-12-31');
  });
});

describe('isWithinRetention', () => {
  it('protegido mientras no pase el plazo', () => {
    expect(isWithinRetention('2026-10-05', '2027-01-01')).toBe(true);
  });
  it('el día exacto del vencimiento todavía está protegido', () => {
    expect(isWithinRetention('2026-10-05', '2031-10-05')).toBe(true);
  });
  it('un día después ya no', () => {
    expect(isWithinRetention('2026-10-05', '2031-10-06')).toBe(false);
  });
});

describe('canReleaseHold', () => {
  it('solo autoridad: admin, gerente SMS y superadmin', () => {
    expect(canReleaseHold('admin')).toBe(true);
    expect(canReleaseHold('gerente_sms')).toBe(true);
    expect(canReleaseHold('superadmin')).toBe(true);
  });
  it('el jefe de pilotos y el piloto no pueden levantar una custodia', () => {
    expect(canReleaseHold('jefe_pilotos')).toBe(false);
    expect(canReleaseHold('piloto')).toBe(false);
    expect(canReleaseHold(undefined)).toBe(false);
  });
});

describe('holdStatus', () => {
  it('activa hasta que se libera', () => {
    expect(holdStatus({ released_at: null })).toBe('activa');
    expect(holdStatus({ released_at: '2026-10-06T00:00:00Z' })).toBe('liberada');
  });
});

describe('RETAINED_RECORD_TYPES', () => {
  it('cada tipo declara tabla, etiqueta y columna de fecha, sin tablas repetidas', () => {
    const tables = RETAINED_RECORD_TYPES.map((t) => t.table);
    expect(new Set(tables).size).toBe(tables.length);
    for (const t of RETAINED_RECORD_TYPES) {
      expect(t.table && t.label && t.dateColumn).toBeTruthy();
    }
  });
  it('el plazo es de 5 años', () => {
    expect(RETENTION_YEARS).toBe(5);
  });
});
