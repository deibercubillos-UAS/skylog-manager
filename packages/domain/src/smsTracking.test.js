import { describe, it, expect } from 'vitest';
import { computeReportDeadline, canCloseCase, validateReportInput, UAS_EVENT_OPTIONS, reportOccurrenceDay, MOR_DEADLINE_BUSINESS_DAYS, buildCaseTimeline } from './smsTracking.js';

const mor = (over = {}) => ({ route: 'mor', occurred_at: '2026-09-07T15:00:00-05:00', created_at: '2026-09-08T12:00:00-05:00', filed_at: null, ...over });

describe('computeReportDeadline', () => {
  it('el MOR vence a los 5 días hábiles de la ocurrencia', () => {
    // lunes 7 de septiembre → lunes 14 de septiembre
    const r = computeReportDeadline(mor(), '2026-09-08');
    expect(MOR_DEADLINE_BUSINESS_DAYS).toBe(5);
    expect(r).toMatchObject({ applicable: true, deadline: '2026-09-14', status: 'en_plazo', businessDaysLeft: 4, estimated: false });
  });

  it('los festivos alargan el plazo (12 de octubre de 2026 es festivo)', () => {
    // viernes 9 de octubre + 5 hábiles: 13, 14, 15, 16, 19 (el lunes 12 no cuenta)
    const r = computeReportDeadline(mor({ occurred_at: '2026-10-09T10:00:00-05:00' }), '2026-10-09');
    expect(r.deadline).toBe('2026-10-19');
  });

  it('estados: por vencer → vence hoy → vencido', () => {
    expect(computeReportDeadline(mor(), '2026-09-10').status).toBe('por_vencer'); // faltan 2
    expect(computeReportDeadline(mor(), '2026-09-14').status).toBe('vence_hoy');
    const late = computeReportDeadline(mor(), '2026-09-16');
    expect(late.status).toBe('vencido');
    expect(late.businessDaysLeft).toBe(-2);
  });

  it('radicado a tiempo o tarde', () => {
    expect(computeReportDeadline(mor({ filed_at: '2026-09-11T09:00:00-05:00' }), '2026-09-30').status).toBe('radicado');
    const tarde = computeReportDeadline(mor({ filed_at: '2026-09-16T09:00:00-05:00' }), '2026-09-30');
    expect(tarde).toMatchObject({ status: 'radicado_tarde', businessDaysLate: 2 });
  });

  it('el día del suceso se mide en hora de Colombia', () => {
    // 22:00 del 7 de septiembre en Bogotá es 03:00 UTC del día 8
    expect(reportOccurrenceDay({ occurred_at: '2026-09-08T03:00:00Z' })).toBe('2026-09-07');
  });

  it('sin fecha del suceso cuenta desde el registro y lo marca como estimado', () => {
    const r = computeReportDeadline(mor({ occurred_at: null }), '2026-09-08');
    expect(r.estimated).toBe(true);
    expect(r.occurredOn).toBe('2026-09-08');
  });

  it('VOR no tiene plazo; RAC 114 es otro procedimiento', () => {
    expect(computeReportDeadline({ route: 'vor', created_at: '2026-09-08T12:00:00Z' }, '2026-09-08')).toEqual({ applicable: false, reason: 'sin_plazo_vor' });
    expect(computeReportDeadline({ route: 'rac114', created_at: '2026-09-08T12:00:00Z' }, '2026-09-08')).toEqual({ applicable: false, reason: 'otro_procedimiento' });
  });
});

describe('canCloseCase', () => {
  it('exige el resumen de la investigación', () => {
    const r = canCloseCase({ report: { route: 'vor' }, investigationSummary: '  ', actions: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('resumen');
  });
  it('un MOR no se cierra sin radicar', () => {
    const r = canCloseCase({ report: { route: 'mor', filed_at: null }, investigationSummary: 'Causa: batería degradada', actions: [] });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('IRIS');
  });
  it('un MOR radicado con resumen se puede cerrar', () => {
    expect(canCloseCase({ report: { route: 'mor', filed_at: '2026-09-10T10:00:00Z' }, investigationSummary: 'ok', actions: [] }).ok).toBe(true);
  });
  it('un VOR no necesita radicación', () => {
    expect(canCloseCase({ report: { route: 'vor' }, investigationSummary: 'ok', actions: [] }).ok).toBe(true);
  });
  it('las acciones pendientes no bloquean pero se cuentan', () => {
    const r = canCloseCase({ report: { route: 'vor' }, investigationSummary: 'ok', actions: [{ done_at: null }, { done_at: '2026-09-09T00:00:00Z' }, { done_at: null }] });
    expect(r).toMatchObject({ ok: true, pendingActions: 2 });
  });
});

describe('validateReportInput', () => {
  const base = { description: 'Pérdida de enlace C2 durante el ascenso', occurredAt: '2026-09-07T10:00:00-05:00', now: '2026-09-08T10:00:00Z', severity: 'incidente', severities: ['incidente', 'incidente_grave', 'accidente'] };
  it('un reporte razonable pasa', () => expect(validateReportInput(base).ok).toBe(true));
  it('descripción muy corta', () => expect(validateReportInput({ ...base, description: 'falla' }).ok).toBe(false));
  it('un suceso en el futuro no es válido', () => expect(validateReportInput({ ...base, occurredAt: '2026-09-09T10:00:00Z' }).ok).toBe(false));
  it('tolera unos minutos de desfase de reloj', () => expect(validateReportInput({ ...base, occurredAt: '2026-09-08T10:03:00Z' }).ok).toBe(true));
  it('fecha ilegible', () => expect(validateReportInput({ ...base, occurredAt: 'ayer' }).ok).toBe(false));
  it('severidad fuera de lista', () => expect(validateReportInput({ ...base, severity: 'grave' }).ok).toBe(false));
  it('la fecha del suceso es opcional', () => expect(validateReportInput({ ...base, occurredAt: undefined }).ok).toBe(true));
});

describe('UAS_EVENT_OPTIONS', () => {
  it('conserva los 12 eventos oficiales con ids únicos (varios comparten código OACI)', () => {
    expect(UAS_EVENT_OPTIONS).toHaveLength(12);
    expect(new Set(UAS_EVENT_OPTIONS.map((o) => o.id)).size).toBe(12);
    expect(new Set(UAS_EVENT_OPTIONS.map((o) => o.code)).size).toBeLessThan(12);
  });
});

describe('buildCaseTimeline', () => {
  const report = { created_at: '2026-09-08T12:00:00Z', analyzed_at: '2026-09-09T12:00:00Z', filed_at: '2026-09-10T12:00:00Z', iris_reference: 'IRIS-123', event_label: 'Pérdida de control en vuelo' };
  const events = [
    { id: 'e2', created_at: '2026-09-09T15:00:00Z', event_type: 'accion_agregada', payload: { description: 'Reemplazar hélices', due_date: '2026-09-20' }, actor: 'Ana' },
    { id: 'e1', created_at: '2026-09-09T13:00:00Z', event_type: 'caso_abierto', payload: {}, actor: 'Ana' },
    { id: 'e3', created_at: '2026-09-12T09:00:00Z', event_type: 'caso_cerrado', payload: { pending_actions: 1 }, actor: 'Ana' },
  ];

  it('mezcla lo derivado del reporte con los eventos y ordena de antigua a reciente', () => {
    const tl = buildCaseTimeline(report, events, { reporter: 'Luis', analyzer: 'Ana' });
    expect(tl.map((x) => x.type)).toEqual(['reporte_creado', 'reporte_analizado', 'caso_abierto', 'accion_agregada', 'reporte_radicado', 'caso_cerrado']);
    expect(tl[0]).toMatchObject({ actor: 'Luis', detail: 'Pérdida de control en vuelo', label: 'Reporte recibido', icon: 'inbox' });
  });

  it('el radicado muestra la referencia de IRIS', () => {
    const tl = buildCaseTimeline(report, [], {});
    expect(tl.find((x) => x.type === 'reporte_radicado').detail).toBe('Referencia IRIS: IRIS-123');
  });

  it('describe las acciones y el cierre con pendientes', () => {
    const tl = buildCaseTimeline(report, events, {});
    expect(tl.find((x) => x.type === 'accion_agregada').detail).toBe('Reemplazar hélices (vence 2026-09-20)');
    expect(tl.find((x) => x.type === 'caso_cerrado').detail).toContain('1 acción');
  });

  it('un reporte sin analizar ni radicar solo aporta su recepción', () => {
    const tl = buildCaseTimeline({ created_at: '2026-09-08T12:00:00Z' }, [], {});
    expect(tl).toHaveLength(1);
  });

  it('un tipo de evento desconocido no rompe: usa el tipo como etiqueta', () => {
    const tl = buildCaseTimeline({ created_at: '2026-09-08T12:00:00Z' }, [{ id: 'x', created_at: '2026-09-09T00:00:00Z', event_type: 'algo_nuevo', payload: {} }], {});
    expect(tl[1]).toMatchObject({ label: 'algo_nuevo', icon: 'circle' });
  });
});
