import { describe, it, expect } from 'vitest';
import { classifyReportRoute, canFileReport } from './smsReporting.js';

describe('classifyReportRoute', () => {
  it('accidente siempre va a RAC 114, nunca MOR/VOR', () => {
    const result = classifyReportRoute({ severity: 'accidente', reportedByRole: 'gerente_sms' });
    expect(result.route).toBe('rac114');
    expect(result.canSubmit).toBe(false);
  });

  it('incidente_grave siempre va a RAC 114, incluso reportado por un piloto', () => {
    const result = classifyReportRoute({ severity: 'incidente_grave', reportedByRole: 'piloto' });
    expect(result.route).toBe('rac114');
  });

  it('reportado por el Gerente SMS es MOR con análisis exigido', () => {
    const result = classifyReportRoute({ severity: 'incidente', reportedByRole: 'gerente_sms' });
    expect(result.route).toBe('mor');
    expect(result.requiresManagerAnalysis).toBe(true);
  });

  it('reportado por cualquier otro rol es VOR sin análisis exigido', () => {
    const result = classifyReportRoute({ severity: 'incidente', reportedByRole: 'piloto' });
    expect(result.route).toBe('vor');
    expect(result.requiresManagerAnalysis).toBe(false);
  });

  it('rechaza una severidad inválida', () => {
    expect(() => classifyReportRoute({ severity: 'grave', reportedByRole: 'piloto' })).toThrow();
  });
});

describe('canFileReport', () => {
  it('rac114 nunca se puede radicar por este flujo', () => {
    expect(canFileReport({ route: 'rac114', requiresManagerAnalysis: false, analyzedAt: null })).toBe(false);
  });

  it('MOR sin análisis previo no puede radicarse', () => {
    expect(canFileReport({ route: 'mor', requiresManagerAnalysis: true, analyzedAt: null })).toBe(false);
  });

  it('MOR con análisis ya hecho puede radicarse', () => {
    expect(canFileReport({ route: 'mor', requiresManagerAnalysis: true, analyzedAt: '2026-09-06T00:00:00Z' })).toBe(true);
  });

  it('VOR puede radicarse sin análisis previo', () => {
    expect(canFileReport({ route: 'vor', requiresManagerAnalysis: false, analyzedAt: null })).toBe(true);
  });
});
