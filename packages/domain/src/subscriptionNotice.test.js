import { describe, it, expect } from 'vitest';
import { daysUntil, subscriptionNotice } from './subscriptionNotice.js';

const now = new Date('2026-10-07T15:00:00Z'); // 10:00 en Colombia

describe('daysUntil (fecha de Colombia)', () => {
  it('cuenta días calendario', () => {
    expect(daysUntil('2026-10-07', now)).toBe(0);
    expect(daysUntil('2026-10-14', now)).toBe(7);
    expect(daysUntil('2026-10-06', now)).toBe(-1);
    expect(daysUntil(null, now)).toBeNull();
  });
  it('a las 21:00 de Colombia ya es el día siguiente en UTC y sigue siendo el mismo día aquí', () => {
    expect(daysUntil('2026-10-07', new Date('2026-10-08T02:30:00Z'))).toBe(0); // 21:30 del 7 en Bogotá
  });
});

describe('subscriptionNotice', () => {
  const sub = (o = {}) => ({ plan: 'escuadrilla', expires_at: '2026-11-30', payment_provider: null, wompi_payment_source_id: null, migrated_from_v1: false, ...o });
  it('Enterprise, sin vencimiento o nada: sin aviso', () => {
    expect(subscriptionNotice(sub({ plan: 'enterprise' }), now).level).toBe('none');
    expect(subscriptionNotice(sub({ expires_at: null }), now).level).toBe('none');
    expect(subscriptionNotice(null, now).level).toBe('none');
  });
  it('lejos del vencimiento y sin migración: sin aviso', () => {
    expect(subscriptionNotice(sub(), now).level).toBe('none');
  });
  it('viene de ePayco y aún no activó Wompi: aviso de migración con su fecha y sin doble cobro', () => {
    const n = subscriptionNotice(sub({ migrated_from_v1: true }), now);
    expect(n.level).toBe('migration');
    expect(n.message).toMatch(/2026-11-30/);
    expect(n.message).toMatch(/dos veces/);
    expect(n.cta).toMatch(/Wompi/);
  });
  it('migrado que ya registró su tarjeta: sin aviso', () => {
    expect(subscriptionNotice(sub({ migrated_from_v1: true, payment_provider: 'wompi', wompi_payment_source_id: 'ps_1' }), now).level).toBe('none');
  });
  it('vence en ≤ 7 días sin tarjeta: aviso previo', () => {
    expect(subscriptionNotice(sub({ expires_at: '2026-10-10' }), now)).toMatchObject({ level: 'upcoming', daysLeft: 3 });
    expect(subscriptionNotice(sub({ expires_at: '2026-10-07' }), now).title).toMatch(/hoy/);
    expect(subscriptionNotice(sub({ expires_at: '2026-10-08' }), now).title).toMatch(/1 día/);
  });
  it('con tarjeta y vencimiento próximo: el cobro automático lo renueva, sin aviso', () => {
    expect(subscriptionNotice(sub({ expires_at: '2026-10-09', payment_provider: 'wompi', wompi_payment_source_id: 'ps' }), now).level).toBe('none');
  });
  it('vencida: aviso distinto con y sin tarjeta, y manda sobre «migración»', () => {
    expect(subscriptionNotice(sub({ expires_at: '2026-10-01' }), now)).toMatchObject({ level: 'expired', cta: 'Pagar ahora' });
    expect(subscriptionNotice(sub({ expires_at: '2026-10-01', payment_provider: 'wompi', wompi_payment_source_id: 'ps' }), now)).toMatchObject({ level: 'expired', cta: 'Revisar el pago' });
    expect(subscriptionNotice(sub({ expires_at: '2026-10-01', migrated_from_v1: true }), now).level).toBe('expired');
  });
});
