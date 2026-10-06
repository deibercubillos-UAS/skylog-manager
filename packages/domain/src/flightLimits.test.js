import { describe, it, expect } from 'vitest';
import { evaluateFlightLimits } from './flightLimits.js';
import { DUTY_LIMITS } from './dutyCompliance.js';

const P = 'pilot-1';
const flight = (takeoff_at, total_time) => ({ pilot_person_id: P, takeoff_at, total_time });

describe('evaluateFlightLimits', () => {
  it('dentro de los límites: sin avisos', () => {
    const r = evaluateFlightLimits([flight('2026-10-02T14:00:00Z', 2)], { personId: P, takeoffAt: '2026-10-05T14:00:00Z', totalTime: 1.5 });
    expect(r.exceeded).toBe(false);
    expect(r.warnings).toEqual([]);
    expect(r.monthly.compliant && r.daily.compliant).toBe(true);
  });

  it('sin vuelos previos tampoco avisa', () => {
    expect(evaluateFlightLimits([], { personId: P, takeoffAt: '2026-10-05T14:00:00Z', totalTime: 1 }).exceeded).toBe(false);
    expect(evaluateFlightLimits(undefined, { personId: P, takeoffAt: '2026-10-05T14:00:00Z', totalTime: 1 }).exceeded).toBe(false);
  });

  it('avisa del límite mensual con las horas reales y el tope', () => {
    const prior = [flight('2026-10-01T14:00:00Z', DUTY_LIMITS.monthlyFlightHours - 1)];
    const r = evaluateFlightLimits(prior, { personId: P, takeoffAt: '2026-10-20T14:00:00Z', totalTime: 3 });
    expect(r.exceeded).toBe(true);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain('mensual');
    expect(r.warnings[0]).toContain('100.540');
    expect(r.warnings[0]).toContain(`${DUTY_LIMITS.monthlyFlightHours + 2}`.replace('.', ','));
  });

  it('avisa del límite diario', () => {
    const limit = DUTY_LIMITS.dailyFlightHoursVlosEvlos;
    const prior = [flight('2026-10-05T13:00:00Z', limit - 0.5)];
    const r = evaluateFlightLimits(prior, { personId: P, takeoffAt: '2026-10-05T17:00:00Z', totalTime: 1 });
    expect(r.exceeded).toBe(true);
    expect(r.warnings.some((w) => w.includes('diario'))).toBe(true);
  });

  it('BVLOS tiene su propio tope diario', () => {
    const vlos = DUTY_LIMITS.dailyFlightHoursVlosEvlos;
    const prior = [flight('2026-10-05T13:00:00Z', vlos - 0.5)];
    const asVlos = evaluateFlightLimits(prior, { personId: P, takeoffAt: '2026-10-05T17:00:00Z', totalTime: 1, lineOfSight: 'VLOS' });
    const asBvlos = evaluateFlightLimits(prior, { personId: P, takeoffAt: '2026-10-05T17:00:00Z', totalTime: 1, lineOfSight: 'BVLOS' });
    expect(asVlos.daily.limit).toBe(vlos);
    expect(asBvlos.daily.limit).toBe(DUTY_LIMITS.dailyFlightHoursBvlos);
  });

  it('puede exceder los dos a la vez', () => {
    const prior = [flight('2026-10-05T10:00:00Z', DUTY_LIMITS.monthlyFlightHours)];
    const r = evaluateFlightLimits(prior, { personId: P, takeoffAt: '2026-10-05T16:00:00Z', totalTime: DUTY_LIMITS.dailyFlightHoursVlosEvlos });
    expect(r.warnings).toHaveLength(2);
  });

  it('los vuelos de otro mes no cuentan para el mensual', () => {
    const prior = [flight('2026-09-10T14:00:00Z', DUTY_LIMITS.monthlyFlightHours)];
    expect(evaluateFlightLimits(prior, { personId: P, takeoffAt: '2026-10-05T14:00:00Z', totalTime: 2 }).monthly.compliant).toBe(true);
  });

  it('el día se mide en hora de Colombia, no en UTC', () => {
    // 02:00 UTC del día 6 es 21:00 del día 5 en Bogotá: pertenece al día 5.
    const limit = DUTY_LIMITS.dailyFlightHoursVlosEvlos;
    const prior = [flight('2026-10-06T02:00:00Z', limit)];
    const r = evaluateFlightLimits(prior, { personId: P, takeoffAt: '2026-10-05T14:00:00Z', totalTime: 0.5 });
    expect(r.daily.compliant).toBe(false);
  });
});
