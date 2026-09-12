import { describe, it, expect } from 'vitest';
import { computeImplementationProgress } from './smsImplementationProgress.js';

describe('computeImplementationProgress', () => {
  it('nada configurado — ninguna fase completa', () => {
    const result = computeImplementationProgress({});
    expect(result.completedCount).toBe(0);
    expect(result.currentPhase).toBe('policy');
  });

  it('fase 1 completa habilita evaluar la fase 2, no la fuerza', () => {
    const result = computeImplementationProgress({ gsoDesignated: true, policySigned: true });
    expect(result.phases.policy).toBe(true);
    expect(result.phases.risk).toBe(false);
    expect(result.currentPhase).toBe('risk');
  });

  it('la fase 2 no cuenta si la fase 1 no está completa (no se salta una fase)', () => {
    const result = computeImplementationProgress({ riskMatrixConfigured: true, hazardsCount: 5 });
    expect(result.phases.risk).toBe(false);
  });

  it('las 4 primeras completas dejan la 5 (expediente) también completa', () => {
    const result = computeImplementationProgress({
      gsoDesignated: true,
      policySigned: true,
      riskMatrixConfigured: true,
      hazardsCount: 2,
      indicatorsWithThreeMonthsData: 3,
      gapAssessmentCompleted: true,
      trainingSessionsWithAttendance: 1,
      msmsPublished: true,
    });
    expect(result.completedCount).toBe(5);
    expect(result.progressPct).toBe(100);
    expect(result.currentPhase).toBeNull();
  });

  it('fase 3 no se marca completa si faltan menos de 3 indicadores con historial', () => {
    const result = computeImplementationProgress({
      gsoDesignated: true,
      policySigned: true,
      riskMatrixConfigured: true,
      hazardsCount: 2,
      indicatorsWithThreeMonthsData: 2,
      gapAssessmentCompleted: true,
    });
    expect(result.phases.assurance).toBe(false);
  });
});
