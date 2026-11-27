import { describe, it, expect } from 'vitest';
import { scoreRiskCard } from './riskCard.js';

const weights = [
  { checklist_id: 'L1', position: 0, weight: 2 },
  { checklist_id: 'L1', position: 1, weight: 5 },
  { checklist_id: 'L2', position: 0, weight: 3 },
];
const thr = { tolerableThreshold: 3, inaceptableThreshold: 7 };

describe('scoreRiskCard', () => {
  it('suma el peso solo de los pasos respondidos "no"', () => {
    const answers = { L1: [{ value: 'no' }, { value: 'si' }], L2: [{ value: 'no' }] };
    const r = scoreRiskCard({ weights, answers, ...thr });
    expect(r.total).toBe(5); // 2 (L1#0) + 3 (L2#0); L1#1 fue "si"
    expect(r.zone).toBe('tolerable'); // 3 <= 5 < 7
    expect(r.maxTotal).toBe(10);
    expect(r.triggered).toHaveLength(2);
  });

  it('sí y na no suman', () => {
    const answers = { L1: [{ value: 'si' }, { value: 'na' }], L2: [{ value: 'si' }] };
    const r = scoreRiskCard({ weights, answers, ...thr });
    expect(r.total).toBe(0);
    expect(r.zone).toBe('aceptable');
  });

  it('total >= umbral inaceptable es inaceptable', () => {
    const answers = { L1: [{ value: 'no' }, { value: 'no' }], L2: [{ value: 'no' }] };
    const r = scoreRiskCard({ weights, answers, ...thr });
    expect(r.total).toBe(10);
    expect(r.zone).toBe('inaceptable');
  });

  it('frontera: total igual al umbral tolerable es tolerable', () => {
    const answers = { L2: [{ value: 'no' }] }; // 3
    const r = scoreRiskCard({ weights, answers, ...thr });
    expect(r.total).toBe(3);
    expect(r.zone).toBe('tolerable');
  });

  it('sin pesos o sin umbrales válidos: no configurado, sin zona', () => {
    expect(scoreRiskCard({ weights: [], answers: {}, ...thr }).configured).toBe(false);
    expect(scoreRiskCard({ weights, answers: {}, tolerableThreshold: 5, inaceptableThreshold: 5 }).configured).toBe(false);
    expect(scoreRiskCard({ weights, answers: {}, tolerableThreshold: null, inaceptableThreshold: null }).zone).toBe(null);
  });

  it('ignora pesos no positivos y respuestas faltantes', () => {
    const r = scoreRiskCard({ weights: [{ checklist_id: 'L1', position: 0, weight: 0 }, { checklist_id: 'L1', position: 1, weight: 4 }], answers: { L1: [{ value: 'no' }] }, ...thr });
    expect(r.total).toBe(0); // peso 0 ignorado; posición 1 sin respuesta
    expect(r.maxTotal).toBe(4);
  });
});
