import { describe, it, expect } from 'vitest';
import { computeGapStats, compareGapAssessments } from './smsGapCompliance.js';

describe('computeGapStats', () => {
  it('sin respuestas — todo en cero', () => {
    const stats = computeGapStats([]);
    expect(stats.total).toBe(0);
    expect(stats.pct).toBe(0);
  });

  it('agrega por componente y total', () => {
    const stats = computeGapStats([
      { componentNumber: 1, response: 'si' },
      { componentNumber: 1, response: 'no' },
      { componentNumber: 2, response: 'si' },
    ]);
    expect(stats.total).toBe(3);
    expect(stats.yes).toBe(2);
    expect(stats.pct).toBeCloseTo((2 / 3) * 100);
    expect(stats.byComponent[1].pct).toBe(50);
    expect(stats.byComponent[2].pct).toBe(100);
  });
});

describe('compareGapAssessments', () => {
  it('primera evaluación — sin comparación posible', () => {
    const current = computeGapStats([{ componentNumber: 1, response: 'si' }]);
    expect(compareGapAssessments(current, null).totalDelta).toBeNull();
  });

  it('calcula la variación real contra la anterior', () => {
    const previous = computeGapStats([
      { componentNumber: 1, response: 'no' },
      { componentNumber: 1, response: 'no' },
    ]);
    const current = computeGapStats([
      { componentNumber: 1, response: 'si' },
      { componentNumber: 1, response: 'no' },
    ]);
    const cmp = compareGapAssessments(current, previous);
    expect(cmp.totalDelta).toBeCloseTo(50);
    expect(cmp.byComponentDelta[1]).toBeCloseTo(50);
  });

  it('un componente nuevo que no existía antes no revienta — delta null', () => {
    const previous = computeGapStats([{ componentNumber: 1, response: 'si' }]);
    const current = computeGapStats([
      { componentNumber: 1, response: 'si' },
      { componentNumber: 5, response: 'no' },
    ]);
    const cmp = compareGapAssessments(current, previous);
    expect(cmp.byComponentDelta[5]).toBeNull();
  });
});
