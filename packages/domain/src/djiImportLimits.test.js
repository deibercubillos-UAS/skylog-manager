import { describe, it, expect } from 'vitest';
import { checkDjiImportBatch, DJI_IMPORT_LIMITS } from './djiImportLimits.js';

const MB = 1024 * 1024;

describe('checkDjiImportBatch', () => {
  it('acepta un lote normal', () => {
    expect(checkDjiImportBatch([200 * 1024, 3 * MB]).ok).toBe(true);
    expect(checkDjiImportBatch(Array(DJI_IMPORT_LIMITS.maxFilesPerRequest).fill(1024)).ok).toBe(true);
  });
  it('rechaza lote vacío (400), demasiados archivos y archivos o lote muy pesados (413)', () => {
    expect(checkDjiImportBatch([])).toMatchObject({ ok: false, status: 400 });
    expect(checkDjiImportBatch(Array(11).fill(1024))).toMatchObject({ ok: false, status: 413 });
    expect(checkDjiImportBatch([6 * MB])).toMatchObject({ ok: false, status: 413 });
    expect(checkDjiImportBatch([NaN])).toMatchObject({ ok: false, status: 413 });
    expect(checkDjiImportBatch(Array(5).fill(5 * MB))).toMatchObject({ ok: false, status: 413 });
  });
});
