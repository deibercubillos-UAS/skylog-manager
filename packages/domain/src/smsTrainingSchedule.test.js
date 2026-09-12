import { describe, it, expect } from 'vitest';
import { cycleLengthDays, occurrencesInRange, nextOccurrence } from './smsTrainingSchedule.js';

describe('cycleLengthDays', () => {
  it('resuelve las recurrencias fijas', () => {
    expect(cycleLengthDays('semanal')).toBe(7);
    expect(cycleLengthDays('quincenal')).toBe(15);
    expect(cycleLengthDays('mensual')).toBe(30);
  });

  it('usa recurrenceDays para personalizado', () => {
    expect(cycleLengthDays('personalizado', 45)).toBe(45);
  });

  it('rechaza personalizado sin recurrenceDays', () => {
    expect(() => cycleLengthDays('personalizado')).toThrow();
  });

  it('rechaza una recurrencia desconocida', () => {
    expect(() => cycleLengthDays('anual')).toThrow();
  });
});

describe('occurrencesInRange', () => {
  const session = { recurrence: 'semanal', startDate: '2026-01-01' };

  it('proyecta las ocurrencias semanales dentro de un rango', () => {
    const result = occurrencesInRange(session, '2026-01-01', '2026-01-22');
    expect(result).toEqual(['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22']);
  });

  it('no incluye ocurrencias fuera del rango', () => {
    const result = occurrencesInRange(session, '2026-01-09', '2026-01-14');
    expect(result).toEqual([]);
  });

  it('empieza en la primera ocurrencia dentro del rango, no siempre en startDate', () => {
    const result = occurrencesInRange(session, '2026-01-10', '2026-01-20');
    expect(result).toEqual(['2026-01-15']);
  });

  it('array vacío si el rango termina antes de empezar la sesión', () => {
    const result = occurrencesInRange(session, '2025-12-01', '2025-12-15');
    expect(result).toEqual([]);
  });
});

describe('nextOccurrence', () => {
  const session = { recurrence: 'mensual', startDate: '2026-01-01' };

  it('devuelve la fecha de inicio si asOf es anterior', () => {
    expect(nextOccurrence(session, new Date('2025-12-01'))).toBe('2026-01-01');
  });

  it('devuelve la próxima ocurrencia futura', () => {
    expect(nextOccurrence(session, new Date('2026-01-15'))).toBe('2026-01-31');
  });
});
