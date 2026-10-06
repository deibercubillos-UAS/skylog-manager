import { describe, it, expect } from 'vitest';
import { SPEC_FIELDS, SPEC_GROUPS, computeSpecCompleteness, sanitizeSpecInput, formatSpecValue } from './aircraftSpecSheet.js';

describe('catálogo', () => {
  it('cubre los atributos del modelo (25 + peso real, que es de la unidad)', () => {
    expect(SPEC_FIELDS).toHaveLength(25);
    expect(new Set(SPEC_FIELDS.map((f) => f.key)).size).toBe(25);
    expect(SPEC_GROUPS).toContain('Enlace C2');
  });
});

describe('computeSpecCompleteness', () => {
  it('modelo vacío: 0 %', () => {
    const r = computeSpecCompleteness({});
    expect(r.filled).toBe(0);
    expect(r.pct).toBe(0);
    expect(r.missing).toHaveLength(25);
  });
  it('cuenta lo lleno; texto en blanco no cuenta; 0 numérico sí', () => {
    const r = computeSpecCompleteness({ mtow_kg: 0.9, ip_rating: '  ', temp_min_c: 0, category: 'ala_rotatoria' });
    expect(r.filled).toBe(3);
    expect(r.missing).not.toContain('Caracterización');
  });
});

describe('tipos compuestos', () => {
  it('lista GNSS, booleano y enlace C2', () => {
    const r = sanitizeSpecInput({ gnss_supported: 'GPS, Galileo ,, GLONASS', obstacle_detection: false, c2_link: { frequencies: '2.4 GHz', latency: '', extra: 'x' } });
    expect(r.errors).toEqual([]);
    expect(r.values.gnss_supported).toEqual(['GPS', 'Galileo', 'GLONASS']);
    expect(r.values.obstacle_detection).toBe(false);
    expect(r.values.c2_link).toEqual({ frequencies: '2.4 GHz' });
  });
  it('vacíos compuestos → null; false y objeto con datos cuentan como llenos', () => {
    expect(sanitizeSpecInput({ gnss_supported: '', c2_link: { latency: ' ' } }).values).toEqual({ gnss_supported: null, c2_link: null });
    expect(computeSpecCompleteness({ obstacle_detection: false, c2_link: { latency: '30 ms' }, gnss_supported: ['GPS'] }).filled).toBe(3);
    expect(computeSpecCompleteness({ c2_link: {}, gnss_supported: [] }).filled).toBe(0);
  });
  it('booleano inválido', () => expect(sanitizeSpecInput({ obstacle_detection: 'si' }).errors).toHaveLength(1));
});

describe('sanitizeSpecInput', () => {
  it('ignora lo que no es del catálogo', () => {
    expect(sanitizeSpecInput({ organization_id: 'x', mtow_kg: '2.5' }).values).toEqual({ mtow_kg: 2.5 });
  });
  it('vacío → null', () => expect(sanitizeSpecInput({ ip_rating: '', range_m: '' }).values).toEqual({ ip_rating: null, range_m: null }));
  it('número inválido o ≤ 0', () => {
    expect(sanitizeSpecInput({ mtow_kg: 'abc' }).errors).toHaveLength(1);
    expect(sanitizeSpecInput({ mtow_kg: '-1' }).errors).toHaveLength(1);
  });
  it('temperatura puede ser negativa', () => expect(sanitizeSpecInput({ temp_min_c: '-20' }).errors).toEqual([]));
  it('opción de despegue inválida', () => {
    expect(sanitizeSpecInput({ takeoff_landing_type: 'VTOL' }).errors).toEqual([]);
    expect(sanitizeSpecInput({ takeoff_landing_type: 'cohete' }).errors).toHaveLength(1);
  });
  it('PMBO no supera MTOW; temp mín ≤ máx', () => {
    expect(sanitizeSpecInput({ mtow_kg: 2, pmbo_kg: 3 }).errors).toHaveLength(1);
    expect(sanitizeSpecInput({ temp_min_c: 50, temp_max_c: 40 }).errors).toHaveLength(1);
  });
});

describe('formatSpecValue', () => {
  const f = (k) => SPEC_FIELDS.find((x) => x.key === k);
  it('formatos por tipo', () => {
    expect(formatSpecValue(f('mtow_kg'), 9.2)).toBe('9.2 kg');
    expect(formatSpecValue(f('obstacle_detection'), false)).toBe('No');
    expect(formatSpecValue(f('gnss_supported'), ['GPS', 'Galileo'])).toBe('GPS, Galileo');
    expect(formatSpecValue(f('category'), 'ala_rotatoria')).toBe('Ala rotatoria');
    expect(formatSpecValue(f('c2_link'), { latency: '30 ms', encryption: 'AES-256' })).toBe('Latencia: 30 ms; Encriptación: AES-256');
  });
  it('vacío → guion', () => {
    expect(formatSpecValue(f('mtow_kg'), null)).toBe('—');
    expect(formatSpecValue(f('c2_link'), {})).toBe('—');
  });
});
