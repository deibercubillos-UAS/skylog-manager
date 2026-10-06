import { describe, it, expect } from 'vitest';
import { validateChangeInput, evaluateTransition, CHANGE_TYPES } from './changeManagement.js';

describe('validateChangeInput', () => {
  it('exige nombre y tipo válido', () => {
    expect(validateChangeInput({ title: '  ', changeType: 'flota' }).ok).toBe(false);
    expect(validateChangeInput({ title: 'Nuevo dron', changeType: 'inventado' }).ok).toBe(false);
    expect(validateChangeInput({ title: 'Nuevo dron', changeType: 'flota' }).ok).toBe(true);
    expect(validateChangeInput({ title: 'Nuevo dron' }).ok).toBe(true);
    expect(CHANGE_TYPES.length).toBe(7);
  });
});

const base = { status: 'identificado', safety_impact: 'por_evaluar', impact_justification: '', human_factors_notes: '', hazard_id: null, decision_notes: '' };

describe('→ evaluado', () => {
  it('sin decidir impacto no pasa', () => {
    expect(evaluateTransition({ change: base, toStatus: 'evaluado' }).ok).toBe(false);
  });
  it('impacto "no" con justificación pasa', () => {
    expect(evaluateTransition({ change: { ...base, safety_impact: 'no', impact_justification: 'Solo cambia el color' }, toStatus: 'evaluado' }).ok).toBe(true);
  });
  it('impacto "no" sin justificación no pasa', () => {
    expect(evaluateTransition({ change: { ...base, safety_impact: 'no' }, toStatus: 'evaluado' }).ok).toBe(false);
  });
  it('impacto "sí" exige peligro enlazado', () => {
    const c = { ...base, safety_impact: 'si', impact_justification: 'Nueva aeronave' };
    expect(evaluateTransition({ change: c, toStatus: 'evaluado' }).ok).toBe(false);
    expect(evaluateTransition({ change: { ...c, hazard_id: 'h1' }, toStatus: 'evaluado' }).ok).toBe(true);
  });
});

describe('→ implementado', () => {
  const evaluated = { ...base, status: 'evaluado', safety_impact: 'si', impact_justification: 'x', hazard_id: 'h1', human_factors_notes: 'Capacitación del PIC' };
  it('impacto "sí": peligro evaluado + factores humanos', () => {
    expect(evaluateTransition({ change: evaluated, toStatus: 'implementado', hazardAssessed: true }).ok).toBe(true);
    expect(evaluateTransition({ change: evaluated, toStatus: 'implementado', hazardAssessed: false }).ok).toBe(false);
    expect(evaluateTransition({ change: { ...evaluated, human_factors_notes: ' ' }, toStatus: 'implementado', hazardAssessed: true }).ok).toBe(false);
  });
  it('impacto "no": basta con estar evaluado', () => {
    expect(evaluateTransition({ change: { ...evaluated, safety_impact: 'no', hazard_id: null, human_factors_notes: '' }, toStatus: 'implementado' }).ok).toBe(true);
  });
  it('no se salta la evaluación', () => {
    expect(evaluateTransition({ change: { ...evaluated, status: 'identificado' }, toStatus: 'implementado', hazardAssessed: true }).ok).toBe(false);
  });
});

describe('descartar y cerrados', () => {
  it('descartar exige motivo', () => {
    expect(evaluateTransition({ change: base, toStatus: 'descartado' }).ok).toBe(false);
    expect(evaluateTransition({ change: { ...base, decision_notes: 'Se canceló el proyecto' }, toStatus: 'descartado' }).ok).toBe(true);
  });
  it('un cambio cerrado no se mueve', () => {
    expect(evaluateTransition({ change: { ...base, status: 'implementado' }, toStatus: 'descartado' }).ok).toBe(false);
    expect(evaluateTransition({ change: { ...base, status: 'descartado' }, toStatus: 'evaluado' }).ok).toBe(false);
  });
});
