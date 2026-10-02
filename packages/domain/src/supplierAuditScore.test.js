import { describe, it, expect } from 'vitest';
import { computeSupplierAuditScore } from './supplierAuditScore.js';

describe('computeSupplierAuditScore', () => {
  it('sin criterios, percentage null', () => {
    expect(computeSupplierAuditScore({}, [])).toEqual({ compliant: 0, nonCompliant: 0, notApplicable: 0, pending: 0, applicable: 0, total: 0, percentage: null });
  });

  it('excluye no_aplica del denominador', () => {
    const responses = { c1: { value: 'cumple' }, c2: { value: 'no_cumple' }, c3: { value: 'no_aplica' } };
    const result = computeSupplierAuditScore(responses, ['c1', 'c2', 'c3']);
    expect(result.applicable).toBe(2);
    expect(result.percentage).toBe(50);
    expect(result.notApplicable).toBe(1);
  });

  it('cuenta pendientes sin responder, no as no_cumple', () => {
    const responses = { c1: { value: 'cumple' } };
    const result = computeSupplierAuditScore(responses, ['c1', 'c2', 'c3']);
    expect(result.pending).toBe(2);
    expect(result.total).toBe(3);
    expect(result.percentage).toBe(100);
  });

  it('percentage null cuando todos son no_aplica o pendientes', () => {
    const responses = { c1: { value: 'no_aplica' } };
    const result = computeSupplierAuditScore(responses, ['c1', 'c2']);
    expect(result.applicable).toBe(0);
    expect(result.percentage).toBeNull();
  });

  it('100% cuando todos los aplicables cumplen', () => {
    const responses = { c1: { value: 'cumple' }, c2: { value: 'cumple' } };
    const result = computeSupplierAuditScore(responses, ['c1', 'c2']);
    expect(result.percentage).toBe(100);
  });

  it('0% cuando ninguno de los aplicables cumple', () => {
    const responses = { c1: { value: 'no_cumple' }, c2: { value: 'no_cumple' } };
    const result = computeSupplierAuditScore(responses, ['c1', 'c2']);
    expect(result.percentage).toBe(0);
  });
});
