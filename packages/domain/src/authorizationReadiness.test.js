import { describe, it, expect } from 'vitest';
import { evaluateCdoForAuthorization, evaluateLeadTime, evaluateAircraftRegistration } from './authorizationReadiness.js';

const period = { startDate: '2026-11-02', endDate: '2026-11-30' };

describe('evaluateCdoForAuthorization', () => {
  it('sin certificado', () => {
    expect(evaluateCdoForAuthorization(null, period, '2026-10-06').status).toBe('sin_cdo');
    expect(evaluateCdoForAuthorization({ cdo_number: '' }, period, '2026-10-06').status).toBe('sin_cdo');
  });
  it('sin fecha de vencimiento', () => {
    expect(evaluateCdoForAuthorization({ cdo_number: 'X1' }, period, '2026-10-06').status).toBe('sin_vigencia');
  });
  it('vencido', () => {
    expect(evaluateCdoForAuthorization({ cdo_number: 'X1', expires_at: '2026-10-01' }, period, '2026-10-06').status).toBe('vencido');
  });
  it('vence antes de terminar el periodo', () => {
    expect(evaluateCdoForAuthorization({ cdo_number: 'X1', expires_at: '2026-11-15' }, period, '2026-10-06').status).toBe('no_cubre_periodo');
  });
  it('cubre todo el periodo (incluye el último día)', () => {
    expect(evaluateCdoForAuthorization({ cdo_number: 'X1', expires_at: '2026-11-30' }, period, '2026-10-06').status).toBe('ok');
  });
});

describe('evaluateLeadTime', () => {
  it('15 o más días hábiles', () => {
    // 2026-10-06 (mar) → 2026-11-30: hay festivos (12 oct, 2 y 16 nov); sobra de 15
    expect(evaluateLeadTime({ scopeStart: '2026-11-30' }, '2026-10-06').status).toBe('ok');
  });
  it('entre 10 y 14: solo corredores BVLOS', () => {
    const r = evaluateLeadTime({ scopeStart: '2026-10-26' }, '2026-10-06'); // 12 oct festivo
    expect(r.businessDays).toBeGreaterThanOrEqual(10);
    expect(r.businessDays).toBeLessThan(15);
    expect(r.status).toBe('solo_corredor_bvlos');
  });
  it('menos de 10', () => {
    expect(evaluateLeadTime({ scopeStart: '2026-10-13' }, '2026-10-06').status).toBe('insuficiente');
  });
  it('ya inició', () => {
    expect(evaluateLeadTime({ scopeStart: '2026-10-06' }, '2026-10-06').status).toBe('pasada');
  });
});

describe('evaluateAircraftRegistration', () => {
  it('sin aeronaves', () => expect(evaluateAircraftRegistration([]).status).toBe('no_aircraft'));
  it('completa', () => expect(evaluateAircraftRegistration([{ id: 'a', ruas_number: 'R1' }]).status).toBe('ok'));
  it('incompleta: lista cuáles faltan', () => {
    const r = evaluateAircraftRegistration([{ id: 'a', ruas_number: 'R1' }, { id: 'b', ruas_number: '  ' }, { id: 'c', ruas_number: null }]);
    expect(r.status).toBe('incompleta');
    expect(r.missing).toEqual(['b', 'c']);
  });
});
