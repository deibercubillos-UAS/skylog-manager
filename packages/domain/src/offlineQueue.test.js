import { describe, it, expect } from 'vitest';
import { enqueue, removeFromQueue, classifySyncResult, applySyncResult, dueItems, pruneQueue, isDraftFresh } from './offlineQueue.js';

const now = Date.parse('2026-10-06T12:00:00Z');

describe('enqueue', () => {
  it('agrega y deduplica por clave (queda el más reciente)', () => {
    let q = enqueue([], { key: 'd1', body: 1 });
    q = enqueue(q, { key: 'd2', body: 2 });
    q = enqueue(q, { key: 'd1', body: 3 });
    expect(q.map((x) => x.key)).toEqual(['d2', 'd1']);
    expect(q.find((x) => x.key === 'd1').body).toBe(3);
    expect(q[0].status).toBe('pendiente');
  });
  it('quitar', () => expect(removeFromQueue([{ key: 'a' }, { key: 'b' }], 'a')).toEqual([{ key: 'b' }]));
});

describe('classifySyncResult', () => {
  it.each([
    [{ networkError: true }, 'retry'],
    [{ status: 200 }, 'sent'],
    [{ status: 409 }, 'duplicate'],
    [{ status: 400 }, 'attention'],
    [{ status: 403 }, 'attention'],
    [{ status: 404 }, 'attention'],
    [{ status: 500 }, 'retry'],
    [{ status: 503 }, 'retry'],
    [{ status: 429 }, 'retry'],
  ])('%j → %s', (input, expected) => expect(classifySyncResult(input)).toBe(expected));
});

describe('applySyncResult', () => {
  const q = [{ key: 'a', attempts: 0, status: 'pendiente' }, { key: 'b', attempts: 0, status: 'pendiente' }];
  it('enviado y duplicado salen de la cola', () => {
    expect(applySyncResult(q, 'a', 'sent')).toHaveLength(1);
    expect(applySyncResult(q, 'a', 'duplicate')).toHaveLength(1);
  });
  it('retry suma intentos; attention queda marcado con el motivo', () => {
    expect(applySyncResult(q, 'a', 'retry')[0].attempts).toBe(1);
    const r = applySyncResult(q, 'a', 'attention', 'Hora inválida')[0];
    expect(r.status).toBe('atencion');
    expect(r.lastError).toBe('Hora inválida');
  });
});

describe('dueItems / pruneQueue / drafts', () => {
  it('no reenvía lo que espera atención ni lo de otro usuario', () => {
    const q = [{ key: 'a', status: 'pendiente', ownerId: 'u1' }, { key: 'b', status: 'atencion', ownerId: 'u1' }, { key: 'c', status: 'pendiente', ownerId: 'u2' }];
    expect(dueItems(q, 'u1').map((x) => x.key)).toEqual(['a']);
  });
  it('descarta lo de más de 14 días', () => {
    const q = [{ key: 'old', queuedAt: '2026-09-01T00:00:00Z' }, { key: 'new', queuedAt: '2026-10-05T00:00:00Z' }];
    expect(pruneQueue(q, now).map((x) => x.key)).toEqual(['new']);
  });
  it('borrador fresco hasta 12 h', () => {
    expect(isDraftFresh({ savedAt: '2026-10-06T05:00:00Z' }, now)).toBe(true);
    expect(isDraftFresh({ savedAt: '2026-10-05T20:00:00Z' }, now)).toBe(false);
    expect(isDraftFresh(null, now)).toBe(false);
    expect(isDraftFresh({ savedAt: '2026-10-06T13:00:00Z' }, now)).toBe(false);
  });
});
