import { describe, it, expect } from 'vitest';
import { dayKey, monthKey } from './operationCalendar.js';
import { checkDailyFlightHours, checkMonthlyFlightHours } from './dutyCompliance.js';

describe('operationCalendar (America/Bogota)', () => {
  it('23:30 hora local sigue siendo el mismo día aunque en UTC ya sea el siguiente', () => {
    expect(dayKey('2026-10-02T04:30:00Z')).toBe('2026-10-01');
  });

  it('18:59 y 19:01 hora local caen en el mismo día (la frontera ya no está a las 19:00)', () => {
    expect(dayKey('2026-10-01T23:59:00Z')).toBe('2026-10-01');
    expect(dayKey('2026-10-02T00:01:00Z')).toBe('2026-10-01');
  });

  it('la medianoche local cambia el día', () => {
    expect(dayKey('2026-10-02T04:59:00Z')).toBe('2026-10-01');
    expect(dayKey('2026-10-02T05:00:00Z')).toBe('2026-10-02');
  });

  it('un vuelo del 30-sep a las 19:00 local sigue contando como septiembre', () => {
    expect(monthKey('2026-10-01T00:00:00Z')).toBe('2026-09');
  });

  it('una fecha YYYY-MM-DD ya es calendario y pasa sin conversión', () => {
    expect(dayKey('2026-10-01')).toBe('2026-10-01');
    expect(monthKey('2026-10-01')).toBe('2026-10');
  });

  it('acepta objetos Date', () => {
    expect(dayKey(new Date('2026-10-02T04:30:00Z'))).toBe('2026-10-01');
  });

  it('8h antes y 8h después de las 19:00 locales suman en el mismo día (límite diario)', () => {
    const flights = [
      { personId: 'p', date: '2026-10-01T20:00:00Z', totalTimeHours: 8 },
      { personId: 'p', date: '2026-10-02T01:00:00Z', totalTimeHours: 8 },
    ];
    const r = checkDailyFlightHours(flights, { personId: 'p', day: '2026-10-01', lineOfSight: 'VLOS' });
    expect(r.hours).toBe(16);
    expect(r.compliant).toBe(false);
  });

  it('el cupo mensual usa el mes local', () => {
    const flights = [{ personId: 'p', date: '2026-10-01T00:30:00Z', totalTimeHours: 10 }];
    expect(checkMonthlyFlightHours(flights, { personId: 'p', month: '2026-09' }).hours).toBe(10);
    expect(checkMonthlyFlightHours(flights, { personId: 'p', month: '2026-10' }).hours).toBe(0);
  });
});
