import { describe, it, expect } from 'vitest';
import {
  RENEWAL_POLICY,
  buildCheckoutReference,
  buildRenewalReference,
  parseWompiReference,
  isRenewalOfCycle,
  isExpectedAmount,
  renewalBaseDate,
  addBillingPeriod,
  nextRenewalAttempt,
} from './subscriptionRenewal.js';

const ORG = '3f2b8c1e-9a4d-4e6b-8c21-0d5e7f9a1b2c';
const PRICING = { escuadrilla: { monthly: { amount: 238000 }, annual: { amount: 2570400 } } };

describe('referencias de Wompi', () => {
  it('lee la referencia del primer pago', () => {
    const ref = buildCheckoutReference({ plan: 'escuadrilla', billing: 'monthly', organizationId: ORG, timestamp: 1700000000000 });
    expect(parseWompiReference(ref)).toEqual({ kind: 'checkout', plan: 'escuadrilla', billing: 'monthly', organizationId: ORG });
  });

  it('lee la referencia de renovación sin confundir "renew" con el plan (bug C2)', () => {
    const ref = buildRenewalReference({ plan: 'flota', billing: 'annual', organizationId: ORG, expiresAt: '2026-11-05', attempt: 2 });
    expect(ref).toBe(`bitafly_v2_renew_flota_annual_${ORG}_20261105_a2`);
    expect(parseWompiReference(ref)).toEqual({ kind: 'renewal', plan: 'flota', billing: 'annual', organizationId: ORG });
  });

  it('rechaza referencias ajenas o mal formadas', () => {
    expect(parseWompiReference('otra_cosa')).toBeNull();
    expect(parseWompiReference('bitafly_v2_flota_monthly_no-es-uuid_1')).toBeNull();
    expect(parseWompiReference(null)).toBeNull();
  });

  it('reconoce los intentos de un ciclo concreto', () => {
    const ref = buildRenewalReference({ plan: 'flota', billing: 'monthly', organizationId: ORG, expiresAt: '2026-11-05', attempt: 1 });
    expect(isRenewalOfCycle(ref, { organizationId: ORG, expiresAt: '2026-11-05' })).toBe(true);
    expect(isRenewalOfCycle(ref, { organizationId: ORG, expiresAt: '2026-12-05' })).toBe(false);
    expect(isRenewalOfCycle(buildCheckoutReference({ plan: 'flota', billing: 'monthly', organizationId: ORG }), { organizationId: ORG, expiresAt: '2026-11-05' })).toBe(false);
  });
});

describe('monto esperado', () => {
  it('acepta solo el precio exacto del plan y ciclo', () => {
    expect(isExpectedAmount({ plan: 'escuadrilla', billing: 'monthly', amountInCents: 23800000, pricing: PRICING })).toBe(true);
    expect(isExpectedAmount({ plan: 'escuadrilla', billing: 'monthly', amountInCents: 100, pricing: PRICING })).toBe(false);
    expect(isExpectedAmount({ plan: 'enterprise', billing: 'monthly', amountInCents: 100, pricing: PRICING })).toBe(false);
    expect(isExpectedAmount({ plan: 'escuadrilla', billing: 'monthly', amountInCents: null, pricing: PRICING })).toBe(false);
  });
});

describe('fecha de vencimiento al pagar', () => {
  const today = new Date('2026-10-16T15:00:00Z');
  it('quien paga antes de vencer no pierde días', () => {
    expect(renewalBaseDate('2026-10-25', today)).toBe('2026-10-25');
    expect(addBillingPeriod(renewalBaseDate('2026-10-25', today), 'monthly')).toBe('2026-11-25');
  });
  it('si ya venció, cuenta desde hoy', () => {
    expect(renewalBaseDate('2026-09-01', today)).toBe('2026-10-16');
    expect(renewalBaseDate(null, today)).toBe('2026-10-16');
  });
  it('suma un año en el ciclo anual', () => {
    expect(addBillingPeriod('2026-10-16', 'annual')).toBe('2027-10-16');
  });
});

describe('política de reintentos del cobro recurrente', () => {
  const day = (d) => new Date(`${d}T12:00:00Z`);
  it('no cobra antes del vencimiento', () => {
    expect(nextRenewalAttempt({ expiresAt: '2026-10-20', today: day('2026-10-16') })).toEqual({ skip: 'not_due' });
  });
  it('primer intento el día del vencimiento', () => {
    expect(nextRenewalAttempt({ expiresAt: '2026-10-16', today: day('2026-10-16') })).toEqual({ attempt: 1 });
  });
  it('no reintenta antes de 3 días (antes se cobraba todos los días)', () => {
    const attempts = [{ createdAt: '2026-10-16T09:00:00Z' }];
    expect(nextRenewalAttempt({ expiresAt: '2026-10-16', today: day('2026-10-17'), attempts })).toEqual({ skip: 'too_soon' });
    expect(nextRenewalAttempt({ expiresAt: '2026-10-16', today: day('2026-10-18'), attempts })).toEqual({ skip: 'too_soon' });
    expect(nextRenewalAttempt({ expiresAt: '2026-10-16', today: day('2026-10-19'), attempts })).toEqual({ attempt: 2 });
  });
  it(`se detiene tras ${RENEWAL_POLICY.maxAttempts} intentos`, () => {
    const attempts = [{ createdAt: '2026-10-16T09:00:00Z' }, { createdAt: '2026-10-19T09:00:00Z' }, { createdAt: '2026-10-22T09:00:00Z' }];
    expect(nextRenewalAttempt({ expiresAt: '2026-10-16', today: day('2026-11-30'), attempts })).toEqual({ skip: 'max_attempts' });
  });
  it('no empieza a cobrar un ciclo vencido hace más de 15 días', () => {
    expect(nextRenewalAttempt({ expiresAt: '2026-09-01', today: day('2026-10-16') })).toEqual({ skip: 'expired_too_long' });
  });
});
