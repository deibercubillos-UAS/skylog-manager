import { describe, it, expect } from 'vitest';
import { mapCaseStatus, transformSmsReport, transformVorMor, transformCaseAction, transformCaseEvent, transformHazard, transformBarrier } from './sms.js';

const ctx = { organization: (id) => (id === 'o1' ? 'O1' : null), personOfProfile: (id) => (id === 'u1' ? 0 : id === 'u2' ? 1 : null), roleOf: (key) => (key === 0 ? 'gerente_sms' : 'piloto') };

describe('estado del caso', () => {
  it('mapea los estados de SMS y VOR/MOR', () => {
    expect(mapCaseStatus('cerrado')).toBe('cerrado');
    expect(mapCaseStatus('archivado')).toBe('cerrado');
    expect(mapCaseStatus('en_investigación')).toBe('en_analisis');
    expect(mapCaseStatus('en_analisis')).toBe('en_analisis');
    expect(mapCaseStatus('recibido')).toBe('abierto');
    expect(mapCaseStatus(null)).toBe('abierto');
  });
});

describe('reporte SMS', () => {
  const rep = (o = {}) => ({ id: 'r1', organization_id: 'o1', owner_id: 'u2', severity: 'incidente', occurrence_date: '2026-02-01T15:00:00Z', location: 'Madrid', event_type: 'Pérdida de enlace', narrative: 'Se perdió el enlace 5 s', immediate_actions: 'RTH', status: 'cerrado', updated_at: '2026-02-10T00:00:00Z', ...o });
  it('incidente de un piloto → VOR sin análisis previo; caso cerrado con su fecha', () => {
    const r = transformSmsReport(rep(), ctx);
    expect(r.ok).toBe(true);
    expect(r.row).toMatchObject({ route: 'vor', requires_manager_analysis: false, severity: 'incidente', event_label: 'Pérdida de enlace', location: 'Madrid' });
    expect(r.row.description).toContain('Acciones inmediatas: RTH');
    expect(r.caseStatus).toBe('cerrado');
    expect(r.caseClosedAt).toBe('2026-02-10T00:00:00Z');
  });
  it('reportado por el Gerente SMS → MOR con análisis previo; accidente → RAC 114', () => {
    expect(transformSmsReport(rep({ owner_id: 'u1' }), ctx).row).toMatchObject({ route: 'mor', requires_manager_analysis: true });
    expect(transformSmsReport(rep({ severity: 'accidente' }), ctx).row.route).toBe('rac114');
  });
  it('sin narrativa usa el tipo de evento; severidad o empresa inválidas se omiten', () => {
    const r = transformSmsReport(rep({ narrative: null, immediate_actions: null }), ctx);
    expect(r.row.description).toBe('Pérdida de enlace');
    expect(transformSmsReport(rep({ severity: 'rara' }), ctx).ok).toBe(false);
    expect(transformSmsReport(rep({ organization_id: 'zz' }), ctx).ok).toBe(false);
  });
});

describe('VOR/MOR público', () => {
  const sub = (o = {}) => ({ organization_id: 'o1', type: 'VOR', status: 'recibido', description: 'Dron cerca de aeropuerto', occurrence_date: '2026-03-01', occurrence_time: '10:30:00', is_anonymous: false, reporter_name: 'Ana', reporter_email: 'a@x.co', ...o });
  it('VOR recibido: abierto, fuente pública, hora de Colombia, contacto del reportante', () => {
    const r = transformVorMor(sub(), ctx);
    expect(r.row).toMatchObject({ route: 'vor', source: 'public', occurred_at: '2026-03-01T15:30:00.000Z', reporter_contact: 'Ana · a@x.co', confidentiality_level: 'normal' });
    expect(r.caseStatus).toBe('abierto');
    expect(r.warnings.join()).toMatch(/severidad/);
  });
  it('anónimo → confidencial y sin contacto; MOR exige análisis; severidad del gestor gana', () => {
    const r = transformVorMor(sub({ type: 'MOR', is_anonymous: true, severity: 'incidente_grave' }), ctx);
    expect(r.row).toMatchObject({ route: 'mor', requires_manager_analysis: true, confidentiality_level: 'confidencial', reporter_contact: null, severity: 'incidente_grave' });
    expect(r.warnings).toEqual([]);
  });
  it('tipo desconocido se omite; sin hora usa el mediodía', () => {
    expect(transformVorMor(sub({ type: 'XYZ' }), ctx).ok).toBe(false);
    expect(transformVorMor(sub({ occurrence_time: null }), ctx).row.occurred_at).toBe('2026-03-01T17:00:00.000Z');
  });
  it('conserva el resumen de investigación y los factores para el caso', () => {
    const r = transformVorMor(sub({ investigation_summary: 'Resumen', contributing_factors: 'Viento' }), ctx);
    expect(r).toMatchObject({ investigationSummary: 'Resumen', contributingFactors: 'Viento' });
  });
});

describe('acciones, eventos, peligros y barreras', () => {
  it('acción: el responsable en texto pasa a la descripción y «hecha» fija la fecha', () => {
    const a = transformCaseAction({ label: 'Reentrenar', owner: 'Jorge', due_date: '2026-04-01', done: true, done_at: '2026-03-20T00:00:00Z' });
    expect(a).toMatchObject({ description: 'Reentrenar (responsable: Jorge)', done_at: '2026-03-20T00:00:00Z' });
    expect(transformCaseAction({ label: 'x', done: false }).done_at).toBeNull();
  });
  it('evento de línea de tiempo conserva su texto y fecha', () => {
    expect(transformCaseEvent({ label: 'Caso abierto', actor_name: 'Gina', created_at: '2026-02-01T00:00:00Z' })).toMatchObject({ event_type: 'migrado', payload: { label: 'Caso abierto', actor_name: 'Gina' } });
  });
  it('peligro con códigos reconocibles genera su evaluación; si no, solo el peligro', () => {
    const ok = transformHazard({ description: 'Torres cerca', source: 'manual', initial_probability_code: '3', initial_severity_code: 'C', mitigation: 'Distancia', responsible: 'GSMS', residual_probability_code: '2', residual_severity_code: 'C' });
    expect(ok.assessment).toMatchObject({ probability_code: 3, severity_code: 'C', residual_probability_code: 2 });
    expect(ok.assessment.mitigation).toContain('Responsable: GSMS');
    const raro = transformHazard({ description: 'x', initial_probability_code: 'Alta', initial_severity_code: '' });
    expect(raro.assessment).toBeNull();
    expect(raro.warning).toMatch(/archivo de v1/);
  });
  it('barrera: nombre y descripción juntos', () => {
    expect(transformBarrier({ name: 'Doble batería', description: 'Siempre dos', category: 'Técnica' })).toMatchObject({ description: 'Doble batería: Siempre dos', category: 'Técnica' });
  });
});
