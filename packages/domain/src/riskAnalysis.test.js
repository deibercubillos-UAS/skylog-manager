import { describe, it, expect } from 'vitest';
import {
  toleranceZone,
  validateHazardEvaluation,
  evaluateRiskAnalysis,
  HAZARD_CATALOG,
} from './riskAnalysis.js';

describe('toleranceZone', () => {
  it('clasifica las 6 combinaciones INTOLERABLE', () => {
    expect(toleranceZone(5, 'A')).toBe('INTOLERABLE');
    expect(toleranceZone(3, 'A')).toBe('INTOLERABLE');
  });

  it('clasifica TOLERABLE', () => {
    expect(toleranceZone(5, 'D')).toBe('TOLERABLE');
    expect(toleranceZone(1, 'A')).toBe('TOLERABLE');
  });

  it('clasifica ACEPTABLE', () => {
    expect(toleranceZone(1, 'E')).toBe('ACEPTABLE');
    expect(toleranceZone(3, 'E')).toBe('ACEPTABLE');
  });

  it('rechaza un índice inválido', () => {
    expect(() => toleranceZone(6, 'A')).toThrow();
    expect(() => toleranceZone(3, 'Z')).toThrow();
  });
});

describe('validateHazardEvaluation', () => {
  it('un peligro en No no requiere nada más', () => {
    const result = validateHazardEvaluation({ answer: false });
    expect(result.applicable).toBe(false);
    expect(result.errors).toEqual([]);
  });

  it('ACEPTABLE no exige mitigación', () => {
    const result = validateHazardEvaluation({
      answer: true,
      probabilityCode: 1,
      severityCode: 'E',
    });
    expect(result.zone).toBe('ACEPTABLE');
    expect(result.compliant).toBe(true);
  });

  it('TOLERABLE sin mitigación es no conforme', () => {
    const result = validateHazardEvaluation({
      answer: true,
      probabilityCode: 5,
      severityCode: 'D',
    });
    expect(result.zone).toBe('TOLERABLE');
    expect(result.compliant).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('INTOLERABLE con mitigación + residual ACEPTABLE es conforme', () => {
    const result = validateHazardEvaluation({
      answer: true,
      probabilityCode: 5,
      severityCode: 'A',
      mitigationStrategy: 'Reducir',
      mitigationDescription: 'Se instalan barreras físicas y se reduce el área de vuelo.',
      residualProbabilityCode: 1,
      residualSeverityCode: 'E',
    });
    expect(result.zone).toBe('INTOLERABLE');
    expect(result.compliant).toBe(true);
  });

  it('residual todavía TOLERABLE/INTOLERABLE exige justificación', () => {
    const result = validateHazardEvaluation({
      answer: true,
      probabilityCode: 5,
      severityCode: 'A',
      mitigationStrategy: 'Reducir',
      mitigationDescription: 'Barreras físicas.',
      residualProbabilityCode: 3,
      residualSeverityCode: 'B',
    });
    expect(result.compliant).toBe(false);
  });

  it('rechaza una estrategia de mitigación fuera de la lista cerrada', () => {
    const result = validateHazardEvaluation({
      answer: true,
      probabilityCode: 5,
      severityCode: 'A',
      mitigationStrategy: 'Aceptar',
      mitigationDescription: 'x',
      residualProbabilityCode: 1,
      residualSeverityCode: 'E',
    });
    expect(result.compliant).toBe(false);
  });
});

describe('evaluateRiskAnalysis', () => {
  it('24 peligros en No puede firmarse', () => {
    const hazards = HAZARD_CATALOG.map((h) => ({ number: h.number, answer: false }));
    const result = evaluateRiskAnalysis(hazards);
    expect(result.canSign).toBe(true);
  });

  it('un peligro en Sí sin evaluar bloquea la firma', () => {
    const hazards = HAZARD_CATALOG.map((h) => ({ number: h.number, answer: false }));
    hazards[0] = { number: 1, answer: true };
    const result = evaluateRiskAnalysis(hazards);
    expect(result.canSign).toBe(false);
    expect(result.errors[0].number).toBe(1);
  });
});
