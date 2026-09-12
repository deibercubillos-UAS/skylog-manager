import { describe, it, expect } from 'vitest';
import { resolveInternalToleranceZone, validateMatrixCompleteness, evaluateInternalHazard } from './internalRiskMatrix.js';

const tolerability = [
  { probabilityCode: 5, severityCode: 'A', zone: 'inaceptable' },
  { probabilityCode: 1, severityCode: 'E', zone: 'aceptable' },
];

describe('resolveInternalToleranceZone', () => {
  it('encuentra una celda configurada', () => {
    expect(resolveInternalToleranceZone(tolerability, 5, 'A')).toEqual({ zone: 'inaceptable', configured: true });
  });

  it('reporta no configurado si la celda no existe', () => {
    expect(resolveInternalToleranceZone(tolerability, 3, 'C')).toEqual({ zone: null, configured: false });
  });
});

describe('validateMatrixCompleteness', () => {
  it('detecta combinaciones faltantes', () => {
    const result = validateMatrixCompleteness(
      [{ code: 5 }, { code: 1 }],
      [{ code: 'A' }, { code: 'E' }],
      tolerability
    );
    expect(result.complete).toBe(false);
    expect(result.missing).toContainEqual({ probabilityCode: 5, severityCode: 'E' });
  });

  it('confirma una matriz completa', () => {
    const full = [
      { probabilityCode: 1, severityCode: 'A', zone: 'x' },
      { probabilityCode: 1, severityCode: 'E', zone: 'x' },
    ];
    const result = validateMatrixCompleteness([{ code: 1 }], [{ code: 'A' }, { code: 'E' }], full);
    expect(result.complete).toBe(true);
  });
});

describe('evaluateInternalHazard', () => {
  it('evalúa solo el inicial si no hay residual', () => {
    const result = evaluateInternalHazard({ tolerability, probabilityCode: 5, severityCode: 'A' });
    expect(result.initialZone).toBe('inaceptable');
    expect(result.residualZone).toBeNull();
  });

  it('evalúa inicial y residual cuando ambos vienen', () => {
    const result = evaluateInternalHazard({
      tolerability,
      probabilityCode: 5,
      severityCode: 'A',
      residualProbabilityCode: 1,
      residualSeverityCode: 'E',
    });
    expect(result.initialZone).toBe('inaceptable');
    expect(result.residualZone).toBe('aceptable');
    expect(result.configured).toBe(true);
  });
});
