import { describe, it, expect } from 'vitest';
import { computePolicyStatus, policyCoversAircraft, findRceCoverage, summarizePolicies, daysBetween, evaluateRceForAuthorization } from './insuranceCoverage.js';

const rce = (over = {}) => ({ policy_type: 'rce', is_active: true, covers_all_fleet: true, aircraft_ids: [], start_date: '2026-01-01', end_date: '2026-12-31', ...over });

describe('daysBetween', () => {
  it('cuenta días calendario, también a través de fin de año', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-10-05', '2026-10-05')).toBe(0);
  });
});

describe('computePolicyStatus', () => {
  it('vigente lejos del vencimiento', () => {
    expect(computePolicyStatus(rce(), '2026-06-01')).toEqual({ status: 'vigente', daysLeft: 213 });
  });
  it('por_vencer dentro de 30 días, incluido el último día', () => {
    expect(computePolicyStatus(rce(), '2026-12-01').status).toBe('por_vencer');
    expect(computePolicyStatus(rce(), '2026-12-31')).toEqual({ status: 'por_vencer', daysLeft: 0 });
  });
  it('exactamente 31 días sigue vigente', () => {
    expect(computePolicyStatus(rce(), '2026-11-30').status).toBe('vigente');
  });
  it('vencida un día después del fin', () => {
    expect(computePolicyStatus(rce(), '2027-01-01')).toEqual({ status: 'vencida', daysLeft: null });
  });
  it('futura antes del inicio', () => {
    expect(computePolicyStatus(rce(), '2025-12-31')).toEqual({ status: 'futura', daysLeft: null });
  });
  it('sin fechas no inventa un estado', () => {
    expect(computePolicyStatus({}, '2026-06-01').status).toBe('sin_datos');
  });
});

describe('policyCoversAircraft', () => {
  it('covers_all_fleet cubre cualquier aeronave', () => {
    expect(policyCoversAircraft(rce(), 'a1')).toBe(true);
  });
  it('lista explícita solo cubre las suyas', () => {
    const p = rce({ covers_all_fleet: false, aircraft_ids: ['a1'] });
    expect(policyCoversAircraft(p, 'a1')).toBe(true);
    expect(policyCoversAircraft(p, 'a2')).toBe(false);
  });
});

describe('findRceCoverage', () => {
  const op = { aircraftId: 'a1', startDate: '2026-06-01', endDate: '2026-06-30' };

  it('sin pólizas', () => {
    expect(findRceCoverage([], op)).toEqual({ covered: false, policy: null, reason: 'sin_poliza_rce' });
  });
  it('ignora pólizas que no son RCE o están inactivas', () => {
    const r = findRceCoverage([rce({ policy_type: 'casco' }), rce({ is_active: false })], op);
    expect(r.reason).toBe('sin_poliza_rce');
  });
  it('cubre cuando la vigencia contiene todo el periodo', () => {
    const p = rce();
    expect(findRceCoverage([p], op)).toEqual({ covered: true, policy: p, reason: null });
  });
  it('el periodo puede tocar exactamente los bordes de la vigencia', () => {
    const r = findRceCoverage([rce()], { aircraftId: 'a1', startDate: '2026-01-01', endDate: '2026-12-31' });
    expect(r.covered).toBe(true);
  });
  it('no cubre si la operación se extiende más allá del fin de la póliza', () => {
    const r = findRceCoverage([rce()], { aircraftId: 'a1', startDate: '2026-12-20', endDate: '2027-01-05' });
    expect(r).toEqual({ covered: false, policy: null, reason: 'vigencia_no_cubre_el_periodo' });
  });
  it('dos pólizas contiguas no suman: cada una debe cubrir todo el periodo', () => {
    const a = rce({ start_date: '2026-01-01', end_date: '2026-06-15' });
    const b = rce({ start_date: '2026-06-16', end_date: '2026-12-31' });
    expect(findRceCoverage([a, b], op).reason).toBe('vigencia_no_cubre_el_periodo');
  });
  it('aeronave fuera de la lista de la póliza', () => {
    const p = rce({ covers_all_fleet: false, aircraft_ids: ['a2'] });
    expect(findRceCoverage([p], op).reason).toBe('aeronave_sin_cobertura');
  });
  it('elige la póliza que sí cubre aunque haya otra vencida', () => {
    const vieja = rce({ start_date: '2025-01-01', end_date: '2025-12-31' });
    const nueva = rce();
    expect(findRceCoverage([vieja, nueva], op).policy).toBe(nueva);
  });
});

describe('summarizePolicies', () => {
  it('cuenta por estado y excluye inactivas', () => {
    const ps = [
      rce(),
      rce({ end_date: '2026-06-20' }),
      rce({ end_date: '2026-05-01' }),
      rce({ start_date: '2027-01-01', end_date: '2027-12-31' }),
      rce({ is_active: false }),
    ];
    expect(summarizePolicies(ps, '2026-06-01')).toEqual({ total: 4, vigente: 1, por_vencer: 1, vencida: 1, futura: 1 });
  });
});

describe('evaluateRceForAuthorization', () => {
  const period = { startDate: '2026-06-01', endDate: '2026-06-30' };
  const fleet = [{ id: 'a1', operational_status: 'disponible' }, { id: 'a2', operational_status: 'en_mantenimiento' }];

  it('flota vacía', () => {
    expect(evaluateRceForAuthorization([rce({ id: 'p1' })], [], period).status).toBe('no_aircraft');
  });
  it('ok cuando una póliza de toda la flota cubre el periodo', () => {
    const r = evaluateRceForAuthorization([rce({ id: 'p1', document_path: 'x.pdf' })], fleet, period);
    expect(r).toMatchObject({ status: 'ok', total: 2, coveredCount: 2, policyIds: ['p1'], missingDocument: [] });
  });
  it('partial cuando la póliza solo cubre una aeronave', () => {
    const p = rce({ id: 'p1', covers_all_fleet: false, aircraft_ids: ['a1'] });
    const r = evaluateRceForAuthorization([p], fleet, period);
    expect(r.status).toBe('partial');
    expect(r.byAircraft.find((x) => x.aircraftId === 'a2')).toMatchObject({ covered: false, reason: 'aeronave_sin_cobertura' });
  });
  it('none cuando la vigencia no cubre el periodo', () => {
    const r = evaluateRceForAuthorization([rce({ id: 'p1', end_date: '2026-06-15' })], fleet, period);
    expect(r.status).toBe('none');
    expect(r.byAircraft[0].reason).toBe('vigencia_no_cubre_el_periodo');
  });
  it('none sin ninguna póliza RCE', () => {
    expect(evaluateRceForAuthorization([], fleet, period).byAircraft[0].reason).toBe('sin_poliza_rce');
  });
  it('ignora aeronaves fuera de servicio', () => {
    const f = [{ id: 'a1', operational_status: 'disponible' }, { id: 'a3', operational_status: 'fuera_de_servicio' }];
    const p = rce({ id: 'p1', covers_all_fleet: false, aircraft_ids: ['a1'] });
    expect(evaluateRceForAuthorization([p], f, period)).toMatchObject({ status: 'ok', total: 1 });
  });
  it('avisa las pólizas que cubren pero no tienen certificado adjunto', () => {
    const r = evaluateRceForAuthorization([rce({ id: 'p1', document_path: null })], fleet, period);
    expect(r.status).toBe('ok');
    expect(r.missingDocument).toEqual(['p1']);
  });
  it('una póliza que no se usa no se reporta como sin certificado', () => {
    const usada = rce({ id: 'p1', document_path: 'x.pdf' });
    const otra = rce({ id: 'p2', policy_type: 'casco', document_path: null });
    expect(evaluateRceForAuthorization([usada, otra], fleet, period).missingDocument).toEqual([]);
  });
});
