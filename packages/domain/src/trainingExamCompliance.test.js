import { describe, it, expect } from 'vitest';
import { currentCycleStart, cycleDeadline, computeExamCompliance, gradeAttempt } from './trainingExamCompliance.js';

const exam = { recurrence: 'mensual', startDate: '2026-01-01', maxAttempts: 2 };

describe('currentCycleStart', () => {
  it('devuelve startDate si asOf es anterior', () => {
    expect(currentCycleStart(exam, new Date('2025-12-15'))).toBe('2026-01-01');
  });

  it('devuelve el inicio del ciclo vigente', () => {
    expect(currentCycleStart(exam, new Date('2026-02-10'))).toBe('2026-01-31');
  });
});

describe('cycleDeadline', () => {
  it('suma la longitud del ciclo al inicio', () => {
    expect(cycleDeadline(exam, '2026-01-01')).toBe('2026-01-31');
  });
});

describe('computeExamCompliance', () => {
  it('not_configured cuando no hay examen', () => {
    expect(computeExamCompliance(null, []).status).toBe('not_configured');
  });

  it('ok cuando ya aprobó el ciclo vigente', () => {
    const attempts = [{ cycleStart: '2026-01-01', passed: true }];
    const result = computeExamCompliance(exam, attempts, new Date('2026-01-15'));
    expect(result.status).toBe('ok');
    expect(result.compliant).toBe(true);
  });

  it('pending cuando aún tiene intentos y no venció el plazo', () => {
    const result = computeExamCompliance(exam, [], new Date('2026-01-15'));
    expect(result.status).toBe('pending');
    expect(result.attemptsRemaining).toBe(2);
  });

  it('failed cuando agotó los intentos dentro de plazo', () => {
    const attempts = [
      { cycleStart: '2026-01-01', passed: false },
      { cycleStart: '2026-01-01', passed: false },
    ];
    const result = computeExamCompliance(exam, attempts, new Date('2026-01-15'));
    expect(result.status).toBe('failed');
    expect(result.compliant).toBe(false);
    expect(result.attemptsRemaining).toBe(0);
  });

  it('sin intentos y sin aprobar dentro del ciclo vigente es pending, no un estado aparte', () => {
    // no existe `overdue`: currentCycleStart siempre contiene a asOf (ciclos
    // rotativos sin huecos) — ver nota de diseño en computeExamCompliance.
    const result = computeExamCompliance(exam, [], new Date('2026-02-05'));
    expect(result.status).toBe('pending');
    expect(result.compliant).toBe(true);
  });
});

describe('gradeAttempt', () => {
  const questions = [
    { correctIndex: 0 },
    { correctIndex: 1 },
    { correctIndex: 2 },
    { correctIndex: 3 },
  ];

  it('califica correctamente y nunca confía en un score externo', () => {
    const result = gradeAttempt(questions, [0, 1, 0, 0], 70);
    expect(result.correctCount).toBe(2);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });

  it('aprueba cuando el score alcanza el umbral', () => {
    const result = gradeAttempt(questions, [0, 1, 2, 0], 70);
    expect(result.score).toBe(75);
    expect(result.passed).toBe(true);
  });

  it('sin preguntas, score 0 y no aprueba', () => {
    expect(gradeAttempt([], [], 70)).toEqual({ score: 0, passed: false, correctCount: 0, total: 0 });
  });
});
