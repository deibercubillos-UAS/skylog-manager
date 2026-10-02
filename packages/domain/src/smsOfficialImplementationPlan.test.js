import { describe, it, expect } from 'vitest';
import { computeOfficialProgress, computeElementStatus, validatePlanHorizon, OFFICIAL_ELEMENTS } from './smsOfficialImplementationPlan.js';

describe('computeElementStatus', () => {
  it('elemento automático ignora manualDone', () => {
    const el = OFFICIAL_ELEMENTS.find((e) => e.key === 'compromiso_direccion');
    expect(computeElementStatus(el, { policySigned: true }, [])).toBe(true);
    expect(computeElementStatus(el, { policySigned: false }, ['compromiso_direccion'])).toBe(false);
  });

  it('elemento manual depende de manualDone', () => {
    const el = OFFICIAL_ELEMENTS.find((e) => e.key === 'comunicacion');
    expect(computeElementStatus(el, {}, [])).toBe(false);
    expect(computeElementStatus(el, {}, ['comunicacion'])).toBe(true);
  });
});

describe('computeOfficialProgress', () => {
  it('nada configurado — ninguna fase completa', () => {
    const result = computeOfficialProgress({}, []);
    expect(result.totalDone).toBe(0);
    expect(result.currentPhase).toBe(1);
  });

  it('fase 1 se completa solo con los 5 elementos reales (3 automáticos + 2 manuales)', () => {
    const result = computeOfficialProgress({ policySigned: true, gsoDesignated: true }, ['rendicion_cuentas', 'plan_emergencias']);
    const phase1 = result.phases.find((p) => p.key === 1);
    // msms_documentacion sigue en false (autoKey msmsPublished, no fabricado)
    expect(phase1.complete).toBe(false);
    expect(phase1.doneCount).toBe(4);
  });

  it('fase 2 nunca se evalúa como bloqueante de fase 3 — las fases son independientes, solo informativas', () => {
    const result = computeOfficialProgress({ riskMatrixConfigured: true, hazardsRegistered: true });
    const phase2 = result.phases.find((p) => p.key === 2);
    expect(phase2.complete).toBe(true);
  });

  it('las 17 filas quedan repartidas en las 4 fases sin huecos', () => {
    const result = computeOfficialProgress({});
    const totalInPhases = result.phases.reduce((n, p) => n + p.totalCount, 0);
    expect(totalInPhases).toBe(OFFICIAL_ELEMENTS.length);
  });

  it('progressPct refleja el total real de 17 elementos', () => {
    const result = computeOfficialProgress(
      { policySigned: true, gsoDesignated: true, hazardsRegistered: true, riskMatrixConfigured: true, spiWithHistory: true, trainingWithAttendance: true },
      []
    );
    // auto: compromiso_direccion, designacion_personal_clave, identificacion_peligros_reactiva,
    // evaluacion_riesgo_reactiva, identificacion_peligros_proactiva, evaluacion_riesgo_proactiva,
    // compromiso_direccion_continuo, observacion_rendimiento, instruccion_educacion = 9
    expect(result.totalDone).toBe(9);
    expect(result.progressPct).toBeCloseTo((9 / 17) * 100);
  });
});

describe('validatePlanHorizon', () => {
  it('acepta el rango oficial 12-24 meses', () => {
    expect(validatePlanHorizon(12)).toBe(true);
    expect(validatePlanHorizon(18)).toBe(true);
    expect(validatePlanHorizon(24)).toBe(true);
  });

  it('rechaza fuera de rango o no entero', () => {
    expect(validatePlanHorizon(11)).toBe(false);
    expect(validatePlanHorizon(25)).toBe(false);
    expect(validatePlanHorizon(18.5)).toBe(false);
    expect(validatePlanHorizon(null)).toBe(false);
  });
});
