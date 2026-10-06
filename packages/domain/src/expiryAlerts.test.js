import { describe, it, expect } from 'vitest';
import { computeExpiryAlerts } from './expiryAlerts.js';

const today = '2026-10-06';
const pol = (o) => ({ id: 'p1', policy_type: 'rce', insurer: 'Sura', is_active: true, start_date: '2026-01-01', end_date: '2027-01-01', ...o });

describe('pólizas', () => {
  it('sin pólizas: nada (es opcional)', () => expect(computeExpiryAlerts({ policies: [], cert: null }, today)).toEqual([]));
  it('vigente lejana: nada', () => expect(computeExpiryAlerts({ policies: [pol()] }, today)).toEqual([]));
  it('por vencer: aviso', () => {
    const a = computeExpiryAlerts({ policies: [pol({ end_date: '2026-10-20' })] }, today);
    expect(a).toHaveLength(1);
    expect(a[0].severity).toBe('warn');
  });
  it('vencida sin reemplazo: alerta roja', () => {
    const a = computeExpiryAlerts({ policies: [pol({ end_date: '2026-09-01' })] }, today);
    expect(a[0].severity).toBe('bad');
  });
  it('vencida pero reemplazada por una vigente: nada', () => {
    const a = computeExpiryAlerts({ policies: [pol({ id: 'old', end_date: '2026-09-01' }), pol({ id: 'new' })] }, today);
    expect(a).toEqual([]);
  });
  it('una vencida de otro tipo no se considera reemplazo', () => {
    const a = computeExpiryAlerts({ policies: [pol({ id: 'old', end_date: '2026-09-01' }), pol({ id: 'c', policy_type: 'casco' })] }, today);
    expect(a).toHaveLength(1);
  });
  it('inactiva se ignora', () => expect(computeExpiryAlerts({ policies: [pol({ is_active: false, end_date: '2026-09-01' })] }, today)).toEqual([]));
});

describe('mercancías peligrosas', () => {
  it('con CDO-U y sin declaración: aviso', () => {
    const a = computeExpiryAlerts({ cert: { cdo_number: 'X', expires_at: '2027-06-01' } }, today);
    expect(a).toHaveLength(1);
    expect(a[0].key).toBe('dg');
  });
  it('declarada o sin CDO-U: nada', () => {
    expect(computeExpiryAlerts({ cert: { cdo_number: 'X', expires_at: '2027-06-01', dangerous_goods_declaration: 'no_transporta' } }, today)).toEqual([]);
    expect(computeExpiryAlerts({ cert: null }, today)).toEqual([]);
  });
});

describe('CDO-U', () => {
  it('lejano: nada; sin fecha: nada', () => {
    expect(computeExpiryAlerts({ cert: { dangerous_goods_declaration: 'no_transporta', cdo_number: 'X', expires_at: '2027-06-01' } }, today)).toEqual([]);
    expect(computeExpiryAlerts({ cert: { dangerous_goods_declaration: 'no_transporta', cdo_number: 'X', expires_at: null } }, today)).toEqual([]);
  });
  it('≤60 días: aviso; vencido: rojo', () => {
    expect(computeExpiryAlerts({ cert: { dangerous_goods_declaration: 'no_transporta', cdo_number: 'X', expires_at: '2026-11-20' } }, today)[0].severity).toBe('warn');
    expect(computeExpiryAlerts({ cert: { dangerous_goods_declaration: 'no_transporta', cdo_number: 'X', expires_at: '2026-10-01' } }, today)[0].severity).toBe('bad');
  });
  it('lo rojo va primero', () => {
    const a = computeExpiryAlerts({ policies: [pol({ end_date: '2026-10-20' })], cert: { dangerous_goods_declaration: 'no_transporta', cdo_number: 'X', expires_at: '2026-10-01' } }, today);
    expect(a.map((x) => x.severity)).toEqual(['bad', 'warn']);
  });
});
