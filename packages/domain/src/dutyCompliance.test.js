import { describe, it, expect } from 'vitest';
import {
  DUTY_LIMITS,
  checkMonthlyFlightHours,
  checkDailyFlightHours,
  checkContinuousOperation,
  checkRestPeriod,
  evaluateDutyCompliance,
} from './dutyCompliance.js';

describe('checkMonthlyFlightHours — 100.540(c)(1), 90h/mes', () => {
  const flights = [
    { personId: 'p1', date: '2026-09-02', totalTimeHours: 40 },
    { personId: 'p1', date: '2026-09-20', totalTimeHours: 49 },
    { personId: 'p1', date: '2026-08-31', totalTimeHours: 100 }, // otro mes, no cuenta
    { personId: 'p2', date: '2026-09-05', totalTimeHours: 200 }, // otra persona, no cuenta
  ];

  it('cumple justo en el límite (89h)', () => {
    const r = checkMonthlyFlightHours(flights, { personId: 'p1', month: '2026-09' });
    expect(r.hours).toBe(89);
    expect(r.compliant).toBe(true);
    expect(r.warning).toBe(true); // ≥80% de 90 = 72h
  });

  it('marca incumplimiento al superar 90h', () => {
    const over = [...flights, { personId: 'p1', date: '2026-09-25', totalTimeHours: 2 }];
    const r = checkMonthlyFlightHours(over, { personId: 'p1', month: '2026-09' });
    expect(r.hours).toBe(91);
    expect(r.compliant).toBe(false);
  });

  it('sin warning por debajo del 80%', () => {
    const low = [{ personId: 'p1', date: '2026-09-02', totalTimeHours: 10 }];
    const r = checkMonthlyFlightHours(low, { personId: 'p1', month: '2026-09' });
    expect(r.warning).toBe(false);
  });
});

describe('checkDailyFlightHours — 100.540(d)(1), 6h BVLOS / 8h VLOS-EVLOS por 24h', () => {
  const flights = [
    { personId: 'p1', date: '2026-09-10', totalTimeHours: 5 },
    { personId: 'p1', date: '2026-09-10', totalTimeHours: 1 },
  ];

  it('BVLOS: 6h justo en el límite cumple', () => {
    const r = checkDailyFlightHours(flights, { personId: 'p1', day: '2026-09-10', lineOfSight: 'BVLOS' });
    expect(r.hours).toBe(6);
    expect(r.limit).toBe(DUTY_LIMITS.dailyFlightHoursBvlos);
    expect(r.compliant).toBe(true);
    expect(r.rule).toBe('100.540(d)(1)(i)');
  });

  it('BVLOS: 6h+1min excede', () => {
    const over = [...flights, { personId: 'p1', date: '2026-09-10', totalTimeHours: 0.1 }];
    const r = checkDailyFlightHours(over, { personId: 'p1', day: '2026-09-10', lineOfSight: 'BVLOS' });
    expect(r.compliant).toBe(false);
  });

  it('VLOS: 6h cumple con margen (límite real es 8h)', () => {
    const r = checkDailyFlightHours(flights, { personId: 'p1', day: '2026-09-10', lineOfSight: 'VLOS' });
    expect(r.limit).toBe(DUTY_LIMITS.dailyFlightHoursVlosEvlos);
    expect(r.compliant).toBe(true);
    expect(r.rule).toBe('100.540(d)(1)(ii)');
  });

  it('EVLOS usa el mismo límite de 8h que VLOS', () => {
    const r = checkDailyFlightHours(flights, { personId: 'p1', day: '2026-09-10', lineOfSight: 'EVLOS' });
    expect(r.limit).toBe(8);
  });
});

describe('checkContinuousOperation — 100.540(e), 2h continuas + 30min de descanso', () => {
  it('cumple: servicio de 2h exacto no exige descanso posterior', () => {
    const periods = [
      { personId: 'p1', type: 'servicio', startedAt: '2026-09-10T08:00:00Z', endedAt: '2026-09-10T10:00:00Z' },
    ];
    const r = checkContinuousOperation(periods, { personId: 'p1' });
    expect(r.compliant).toBe(true);
  });

  it('incumple: servicio >2h seguido de menos de 30min de descanso', () => {
    const periods = [
      { personId: 'p1', type: 'servicio', startedAt: '2026-09-10T08:00:00Z', endedAt: '2026-09-10T10:30:00Z' },
      { personId: 'p1', type: 'servicio', startedAt: '2026-09-10T10:45:00Z', endedAt: '2026-09-10T11:00:00Z' },
    ];
    const r = checkContinuousOperation(periods, { personId: 'p1' });
    expect(r.compliant).toBe(false);
    expect(r.violations).toHaveLength(1);
  });

  it('cumple: servicio >2h seguido de exactamente 30min de descanso', () => {
    const periods = [
      { personId: 'p1', type: 'servicio', startedAt: '2026-09-10T08:00:00Z', endedAt: '2026-09-10T10:30:00Z' },
      { personId: 'p1', type: 'servicio', startedAt: '2026-09-10T11:00:00Z', endedAt: '2026-09-10T11:30:00Z' },
    ];
    const r = checkContinuousOperation(periods, { personId: 'p1' });
    expect(r.compliant).toBe(true);
  });

  it('incumple: servicio >2h como último período de la lista, sin descanso registrado después', () => {
    const periods = [
      { personId: 'p1', type: 'servicio', startedAt: '2026-09-10T08:00:00Z', endedAt: '2026-09-10T10:30:00Z' },
    ];
    const r = checkContinuousOperation(periods, { personId: 'p1' });
    expect(r.compliant).toBe(false);
  });

  it('ignora períodos de descanso/disponibilidad y de otras personas', () => {
    const periods = [
      { personId: 'p1', type: 'descanso', startedAt: '2026-09-10T00:00:00Z', endedAt: '2026-09-10T05:00:00Z' },
      { personId: 'p2', type: 'servicio', startedAt: '2026-09-10T08:00:00Z', endedAt: '2026-09-10T12:00:00Z' },
    ];
    const r = checkContinuousOperation(periods, { personId: 'p1' });
    expect(r.compliant).toBe(true);
    expect(r.violations).toHaveLength(0);
  });
});

describe('checkRestPeriod — 100.540(f)(2), descanso tras servicio', () => {
  it('servicio ≤8h exige 10h de descanso — cumple justo en el límite', () => {
    const r = checkRestPeriod({ serviceDurationHours: 8, restDurationHours: 10 });
    expect(r.requiredHours).toBe(10);
    expect(r.compliant).toBe(true);
  });

  it('servicio ≤8h con menos de 10h de descanso incumple (f)(2)(i)', () => {
    const r = checkRestPeriod({ serviceDurationHours: 6, restDurationHours: 9 });
    expect(r.compliant).toBe(false);
    expect(r.violations[0].rule).toBe('100.540(f)(2)(i)');
  });

  it('servicio >8h exige 12h de descanso — cumple justo en el límite', () => {
    const r = checkRestPeriod({ serviceDurationHours: 9, restDurationHours: 12 });
    expect(r.requiredHours).toBe(12);
    expect(r.compliant).toBe(true);
  });

  it('servicio >8h con menos de 12h de descanso incumple (f)(2)(ii)', () => {
    const r = checkRestPeriod({ serviceDurationHours: 10, restDurationHours: 11 });
    expect(r.compliant).toBe(false);
    expect(r.violations[0].rule).toBe('100.540(f)(2)(ii)');
  });

  it('descanso nunca puede ser menor que el servicio anterior (f)(2)(iii), incluso si supera el mínimo fijo', () => {
    // Servicio larguísimo de 20h (>8h → mínimo fijo 12h), descanso de 15h —
    // cumple el mínimo fijo pero es menor que las 20h de servicio previo.
    const r = checkRestPeriod({ serviceDurationHours: 20, restDurationHours: 15 });
    expect(r.compliant).toBe(false);
    expect(r.violations.some((v) => v.rule === '100.540(f)(2)(iii)')).toBe(true);
  });

  it('descanso fraccionado siempre incumple (f)(2)(iv), aunque la duración total alcance', () => {
    const r = checkRestPeriod({ serviceDurationHours: 6, restDurationHours: 10, isFractioned: true });
    expect(r.compliant).toBe(false);
    expect(r.violations.some((v) => v.rule === '100.540(f)(2)(iv)')).toBe(true);
  });

  it('descanso suficiente, no fraccionado, mayor al servicio previo: cumple sin violaciones', () => {
    const r = checkRestPeriod({ serviceDurationHours: 7, restDurationHours: 10, isFractioned: false });
    expect(r.compliant).toBe(true);
    expect(r.violations).toHaveLength(0);
  });
});

describe('evaluateDutyCompliance — agregador', () => {
  it('bloquea despacho si cualquier regla evaluada incumple', () => {
    const flights = [{ personId: 'p1', date: '2026-09-10', totalTimeHours: 7 }];
    const dutyPeriods = [];
    const result = evaluateDutyCompliance(
      { dutyPeriods, flights },
      { personId: 'p1', month: '2026-09', day: '2026-09-10', lineOfSight: 'BVLOS' }
    );
    expect(result.checks.dailyFlight.compliant).toBe(false); // 7h > 6h BVLOS
    expect(result.blocksDispatch).toBe(true);
  });

  it('no bloquea despacho si todas las reglas evaluadas cumplen', () => {
    const flights = [{ personId: 'p1', date: '2026-09-10', totalTimeHours: 3 }];
    const result = evaluateDutyCompliance(
      { dutyPeriods: [], flights },
      { personId: 'p1', month: '2026-09', day: '2026-09-10', lineOfSight: 'VLOS' }
    );
    expect(result.blocksDispatch).toBe(false);
  });

  it('la regla de descanso queda en null si no hay datos de servicio/descanso, sin bloquear por su ausencia', () => {
    const result = evaluateDutyCompliance(
      { dutyPeriods: [], flights: [] },
      { personId: 'p1', month: '2026-09', day: '2026-09-10', lineOfSight: 'VLOS' }
    );
    expect(result.checks.rest).toBeNull();
    expect(result.blocksDispatch).toBe(false);
  });
});
