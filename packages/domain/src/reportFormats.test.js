import { describe, it, expect } from 'vitest';
import { resolveReportFormat, sanitizeReportFormats, REPORT_FORMAT_KEYS, REPORT_FORMAT_DEFAULTS } from './reportFormats.js';

describe('resolveReportFormat', () => {
  it('sin configuración usa el código por defecto y versión 1.0', () => {
    expect(resolveReportFormat({}, 'vuelos')).toEqual({ code: 'F-OPS-002', version: '1.0' });
    expect(resolveReportFormat(null, 'baterias')).toEqual({ code: 'F-MNT-003', version: '1.0' });
  });

  it('un reporte sin código por defecto sale sin código', () => {
    expect(resolveReportFormat({}, 'duty')).toEqual({ code: '', version: '1.0' });
  });

  it('respeta lo que definió la organización', () => {
    expect(resolveReportFormat({ vuelos: { code: 'MO-LV-01', version: '3' } }, 'vuelos')).toEqual({ code: 'MO-LV-01', version: '3' });
  });

  it('un código vacío guardado explícitamente NO vuelve al valor por defecto', () => {
    expect(resolveReportFormat({ vuelos: { code: '' } }, 'vuelos').code).toBe('');
  });

  it('solo la versión definida: el código sigue siendo el de por defecto', () => {
    expect(resolveReportFormat({ vuelos: { version: '2.1' } }, 'vuelos')).toEqual({ code: 'F-OPS-002', version: '2.1' });
  });

  it('todos los reportes conocidos tienen entrada de código por defecto', () => {
    for (const k of REPORT_FORMAT_KEYS) expect(k in REPORT_FORMAT_DEFAULTS).toBe(true);
  });
});

describe('sanitizeReportFormats', () => {
  it('acepta y recorta valores válidos', () => {
    const r = sanitizeReportFormats({ vuelos: { code: '  MO-LV-01 ', version: ' 2 ' } });
    expect(r).toEqual({ ok: true, value: { vuelos: { code: 'MO-LV-01', version: '2' } } });
  });

  it('rechaza reportes desconocidos', () => {
    expect(sanitizeReportFormats({ inventado: { code: 'X' } }).ok).toBe(false);
  });

  it('rechaza caracteres peligrosos o raros', () => {
    expect(sanitizeReportFormats({ vuelos: { code: '<script>' } }).ok).toBe(false);
    expect(sanitizeReportFormats({ vuelos: { version: '1;drop' } }).ok).toBe(false);
  });

  it('rechaza textos demasiado largos', () => {
    expect(sanitizeReportFormats({ vuelos: { code: 'A'.repeat(25) } }).ok).toBe(false);
    expect(sanitizeReportFormats({ vuelos: { version: 'V'.repeat(13) } }).ok).toBe(false);
  });

  it('rechaza entradas que no son objetos', () => {
    expect(sanitizeReportFormats(null).ok).toBe(false);
    expect(sanitizeReportFormats([]).ok).toBe(false);
    expect(sanitizeReportFormats({ vuelos: 'F-OPS-002' }).ok).toBe(false);
  });

  it('un código vacío es válido (el PDF sale sin código)', () => {
    expect(sanitizeReportFormats({ vuelos: { code: '' } })).toEqual({ ok: true, value: { vuelos: { code: '' } } });
  });
});
