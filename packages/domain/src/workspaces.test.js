import { describe, it, expect } from 'vitest';
import { NAV_SECTIONS } from './workspaces.js';

describe('NAV_SECTIONS', () => {
  it('define las 7 secciones reales, en orden', () => {
    expect(NAV_SECTIONS.map((s) => s.key)).toEqual([
      'operacion',
      'flota-tripulacion',
      'sms',
      'capacitacion',
      'reportes',
      'control-documental',
      'organizacion',
    ]);
  });
});
