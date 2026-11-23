import { describe, it, expect } from 'vitest';
import {
  STANDARD_REPORT_FIELDS,
  effectiveFormFields,
  defaultFormFields,
  validateCustomValues,
  validateReportFormSubmission,
  routeForPublicLink,
} from './smsReportForms.js';

const NOW = '2026-11-23T12:00:00-05:00';

describe('catálogo de campos estándar', () => {
  it('tiene 8 campos y solo descripción y severidad están bloqueados', () => {
    expect(STANDARD_REPORT_FIELDS).toHaveLength(8);
    const locked = STANDARD_REPORT_FIELDS.filter((f) => f.locked).map((f) => f.key).sort();
    expect(locked).toEqual(['description', 'severity']);
  });
});

describe('defaultFormFields', () => {
  it('siembra los 8 estándar con report_type y descripción obligatoria', () => {
    const rows = defaultFormFields('mor');
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.report_type === 'mor' && r.kind === 'standard')).toBe(true);
    const desc = rows.find((r) => r.field_key === 'description');
    expect(desc).toMatchObject({ required: true, visible: true, locked: true });
  });
});

describe('effectiveFormFields', () => {
  it('sin filas guardadas devuelve el catálogo estándar en orden', () => {
    const fields = effectiveFormFields('vor', []);
    expect(fields.map((f) => f.field_key)).toEqual(STANDARD_REPORT_FIELDS.map((f) => f.key));
    expect(fields.every((f) => f.kind === 'standard')).toBe(true);
  });

  it('aplica ocultar/renombrar de un estándar NO bloqueado', () => {
    const fields = effectiveFormFields('vor', [
      { id: 'a', kind: 'standard', field_key: 'location', label: 'Sitio', visible: false, sort_order: 3 },
    ]);
    const loc = fields.find((f) => f.field_key === 'location');
    expect(loc).toMatchObject({ label: 'Sitio', visible: false });
  });

  it('ignora intentos de ocultar o volver opcional un campo bloqueado', () => {
    const fields = effectiveFormFields('vor', [
      { id: 'd', kind: 'standard', field_key: 'description', visible: false, required: false, label: 'Relato' },
    ]);
    const desc = fields.find((f) => f.field_key === 'description');
    expect(desc).toMatchObject({ visible: true, required: true, label: 'Relato' });
  });

  it('añade las preguntas propias y ordena por sort_order', () => {
    const fields = effectiveFormFields('vor', [
      { id: 'c1', kind: 'custom', label: 'Fase de vuelo', input_type: 'select', options: ['despegue', 'crucero'], required: true, sort_order: 2 },
    ]);
    const custom = fields.filter((f) => f.kind === 'custom');
    expect(custom).toHaveLength(1);
    expect(custom[0]).toMatchObject({ id: 'c1', input_type: 'select', required: true, visible: true });
  });
});

describe('validateCustomValues', () => {
  const defs = [
    { id: 'txt', kind: 'custom', label: 'Comentario', input_type: 'text', required: true, visible: true, options: [] },
    { id: 'num', kind: 'custom', label: 'Altura (m)', input_type: 'number', required: false, visible: true, options: [] },
    { id: 'sel', kind: 'custom', label: 'Fase', input_type: 'select', required: false, visible: true, options: ['despegue', 'crucero'] },
    { id: 'hid', kind: 'custom', label: 'Oculto', input_type: 'text', required: true, visible: false, options: [] },
  ];

  it('exige las obligatorias visibles y salta las ocultas', () => {
    const r = validateCustomValues(defs, {});
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('"Comentario" es obligatorio.');
    expect(r.errors.join()).not.toContain('Oculto');
  });

  it('normaliza número y rechaza no numérico', () => {
    expect(validateCustomValues(defs, { txt: 'x', num: '12.5' }).normalized.num).toBe(12.5);
    expect(validateCustomValues(defs, { txt: 'x', num: 'abc' }).ok).toBe(false);
  });

  it('rechaza una opción fuera de la lista del select', () => {
    expect(validateCustomValues(defs, { txt: 'x', sel: 'aterrizaje' }).ok).toBe(false);
    expect(validateCustomValues(defs, { txt: 'x', sel: 'crucero' }).normalized.sel).toBe('crucero');
  });
});

describe('validateReportFormSubmission', () => {
  it('exige un estándar no bloqueado marcado obligatorio y visible', () => {
    const fieldDefs = effectiveFormFields('vor', [
      { id: 'l', kind: 'standard', field_key: 'location', required: true, visible: true, sort_order: 3 },
    ]);
    const r = validateReportFormSubmission({
      fieldDefs,
      standardValues: { description: 'Un suceso descrito con detalle suficiente.', severity: 'incidente', location: '' },
      now: NOW,
    });
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('"Lugar" es obligatorio.');
  });

  it('pasa con descripción válida y devuelve custom_fields normalizados', () => {
    const fieldDefs = effectiveFormFields('vor', [
      { id: 'c1', kind: 'custom', label: 'Fase', input_type: 'select', options: ['crucero'], required: true, visible: true, sort_order: 9 },
    ]);
    const r = validateReportFormSubmission({
      fieldDefs,
      standardValues: { description: 'Un suceso descrito con detalle suficiente.', severity: 'incidente' },
      customValues: { c1: 'crucero' },
      now: NOW,
    });
    expect(r.ok).toBe(true);
    expect(r.customFields).toEqual({ c1: 'crucero' });
  });
});

describe('routeForPublicLink', () => {
  it('un suceso grave va por RAC 114 por cualquier enlace', () => {
    expect(routeForPublicLink({ linkType: 'mor', severity: 'incidente_grave' })).toMatchObject({ route: 'rac114', canSubmit: false });
    expect(routeForPublicLink({ linkType: 'vor', severity: 'accidente' })).toMatchObject({ route: 'rac114', canSubmit: false });
  });

  it('el enlace MOR crea un MOR con compuerta de análisis', () => {
    expect(routeForPublicLink({ linkType: 'mor', severity: 'incidente' })).toEqual({ route: 'mor', requiresManagerAnalysis: true, canSubmit: true });
  });

  it('el enlace VOR crea un VOR sin análisis previo', () => {
    expect(routeForPublicLink({ linkType: 'vor', severity: 'incidente' })).toEqual({ route: 'vor', requiresManagerAnalysis: false, canSubmit: true });
  });

  it('rechaza una severidad inválida', () => {
    expect(() => routeForPublicLink({ linkType: 'vor', severity: 'leve' })).toThrow();
  });
});
