import { describe, it, expect } from 'vitest';
import { computeEvaluationCompliance, personEvaluationStatus } from './evaluationCompliance.js';

const evaluation = { id: 'e1', dueDate: '2026-03-31', maxAttempts: 2 };

describe('computeEvaluationCompliance', () => {
  it('not_configured cuando no hay evaluación', () => {
    expect(computeEvaluationCompliance(null, []).status).toBe('not_configured');
  });

  it('ok cuando ya la aprobó, antes de la fecha límite', () => {
    const result = computeEvaluationCompliance(evaluation, [{ passed: true }], new Date('2026-02-01'));
    expect(result.status).toBe('ok');
    expect(result.compliant).toBe(true);
  });

  it('ok cuando la aprobó DESPUÉS de la fecha límite — una aprobación tardía sigue contando', () => {
    const result = computeEvaluationCompliance(evaluation, [{ passed: false }, { passed: true }], new Date('2026-04-15'));
    expect(result.status).toBe('ok');
  });

  it('pending cuando tiene intentos disponibles y no venció el plazo', () => {
    const result = computeEvaluationCompliance(evaluation, [], new Date('2026-02-01'));
    expect(result.status).toBe('pending');
    expect(result.attemptsRemaining).toBe(2);
  });

  it('overdue cuando venció el plazo, sin aprobar, pero con intentos disponibles', () => {
    const result = computeEvaluationCompliance(evaluation, [{ passed: false }], new Date('2026-04-15'));
    expect(result.status).toBe('overdue');
    expect(result.compliant).toBe(false);
    expect(result.attemptsRemaining).toBe(1);
  });

  it('failed cuando agotó los intentos sin aprobar, incluso antes del plazo', () => {
    const attempts = [{ passed: false }, { passed: false }];
    const result = computeEvaluationCompliance(evaluation, attempts, new Date('2026-02-01'));
    expect(result.status).toBe('failed');
    expect(result.compliant).toBe(false);
    expect(result.attemptsRemaining).toBe(0);
  });

  it('failed tiene prioridad sobre overdue cuando ambos aplican', () => {
    const attempts = [{ passed: false }, { passed: false }];
    const result = computeEvaluationCompliance(evaluation, attempts, new Date('2026-04-15'));
    expect(result.status).toBe('failed');
  });
});

describe('personEvaluationStatus', () => {
  const evalQ1 = { id: 'q1', dueDate: '2026-03-31', maxAttempts: 2 };
  const evalQ2 = { id: 'q2', dueDate: '2026-06-30', maxAttempts: 2 };

  it('not_configured sin ninguna evaluación', () => {
    const result = personEvaluationStatus([], new Map());
    expect(result.compliance.status).toBe('not_configured');
    expect(result.evaluation).toBeNull();
  });

  it('bloquea por la primera evaluación (cronológica) sin aprobar', () => {
    const attempts = new Map([['q1', [{ passed: false }]]]);
    const result = personEvaluationStatus([evalQ2, evalQ1], attempts, new Date('2026-02-01'));
    expect(result.evaluation.id).toBe('q1');
    expect(result.compliance.status).toBe('pending');
  });

  it('si ya aprobó la primera, pasa a evaluar la siguiente', () => {
    const attempts = new Map([['q1', [{ passed: true }]]]);
    const result = personEvaluationStatus([evalQ1, evalQ2], attempts, new Date('2026-04-01'));
    expect(result.evaluation.id).toBe('q2');
    expect(result.compliance.status).toBe('pending');
  });

  it('ok referenciando la más reciente cuando aprobó todas', () => {
    const attempts = new Map([
      ['q1', [{ passed: true }]],
      ['q2', [{ passed: true }]],
    ]);
    const result = personEvaluationStatus([evalQ1, evalQ2], attempts, new Date('2026-07-01'));
    expect(result.compliance.status).toBe('ok');
    expect(result.evaluation.id).toBe('q2');
  });
});
