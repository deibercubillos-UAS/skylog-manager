import { describe, it, expect } from 'vitest';
import { fetchAllPages } from './paginate.js';

const source = (n) => async (from, to) => ({ data: Array.from({ length: n }, (_, i) => i).slice(from, to + 1), error: null });

describe('fetchAllPages', () => {
  it('junta todas las páginas (2.500 filas con páginas de 1.000)', async () => {
    const r = await fetchAllPages(source(2500));
    expect(r.rows).toHaveLength(2500);
    expect(r.rows[0]).toBe(0);
    expect(r.rows[2499]).toBe(2499);
    expect(r.truncated).toBe(false);
  });
  it('una página exacta pide una más para confirmar que terminó', async () => {
    let calls = 0;
    const fp = async (from, to) => { calls++; return source(2000)(from, to); };
    const r = await fetchAllPages(fp);
    expect(r.rows).toHaveLength(2000);
    expect(calls).toBe(3);
  });
  it('sin filas devuelve lista vacía', async () => {
    expect((await fetchAllPages(source(0))).rows).toEqual([]);
  });
  it('un error en cualquier página se propaga y no devuelve datos parciales', async () => {
    const fp = async (from) => (from >= 1000 ? { data: null, error: { message: 'x' } } : { data: new Array(1000).fill(1), error: null });
    const r = await fetchAllPages(fp);
    expect(r.error).toBeTruthy();
    expect(r.rows).toBeNull();
  });
  it('avisa cuando llega al tope de páginas', async () => {
    const r = await fetchAllPages(source(10), { pageSize: 2, maxPages: 3 });
    expect(r.rows).toHaveLength(6);
    expect(r.truncated).toBe(true);
  });
});
