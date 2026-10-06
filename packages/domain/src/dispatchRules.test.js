import { describe, it, expect } from 'vitest';
import { buildDispatchGates, evaluateDispatchRisk, buildChecklistItems, validateFlightClose } from './dispatchRules.js';

const okInput = () => ({
  mission: { status: 'programada' },
  isPic: true,
  missionDate: '2026-10-05',
  today: '2026-10-05',
  openPeriodType: null,
  service: { rest: { compliant: true }, monthly: { compliant: true }, daily: { compliant: true } },
  exam: { compliant: true },
  aircraft: { assigned: true, operationalStatus: 'disponible' },
  insurance: { covered: true, reason: null },
  checklistCount: 2,
  riskMatrixReady: true,
});

describe('buildDispatchGates', () => {
  it('todo en orden: se puede despachar', () => {
    const r = buildDispatchGates(okInput());
    expect(r.canDispatch).toBe(true);
    expect(r.blockedBy).toEqual([]);
    expect(r.gates.every((g) => g.status === 'ok')).toBe(true);
  });

  it('solo bloquean programación, servicio, examen y aeronave', () => {
    const r = buildDispatchGates({
      ...okInput(),
      isPic: false,
      service: { rest: { compliant: false }, monthly: { compliant: true }, daily: { compliant: true } },
      exam: { compliant: false },
      aircraft: { assigned: true, operationalStatus: 'en_mantenimiento' },
    });
    expect(r.blockedBy.sort()).toEqual(['aircraft', 'duty', 'schedule', 'training']);
    expect(r.canDispatch).toBe(false);
  });

  it('listas y matriz sin configurar solo avisan', () => {
    const r = buildDispatchGates({ ...okInput(), checklistCount: 0, riskMatrixReady: false });
    expect(r.canDispatch).toBe(true);
    expect(r.gates.filter((g) => g.status === 'warn').map((g) => g.id)).toEqual(['checklists', 'risk_matrix']);
  });

  it('la póliza es opcional: sin pólizas registradas no se menciona', () => {
    const r = buildDispatchGates({ ...okInput(), insurance: { covered: false, reason: 'sin_poliza_rce' } });
    expect(r.gates.some((g) => g.id === 'insurance')).toBe(false);
    expect(r.canDispatch).toBe(true);
  });

  it('con pólizas que no cubren hoy solo informa, sin alarma ni bloqueo', () => {
    for (const reason of ['aeronave_sin_cobertura', 'vigencia_no_cubre_el_periodo']) {
      const r = buildDispatchGates({ ...okInput(), insurance: { covered: false, reason } });
      const g = r.gates.find((x) => x.id === 'insurance');
      expect(g).toMatchObject({ status: 'info', blocking: false });
      expect(g.message).toContain('no restringe el vuelo');
      expect(r.canDispatch).toBe(true);
      expect(r.gates.filter((x) => x.status === 'warn')).toEqual([]);
    }
  });

  it('una misión de otro día no se despacha', () => {
    const r = buildDispatchGates({ ...okInput(), missionDate: '2026-10-06' });
    expect(r.blockedBy).toEqual(['schedule']);
    expect(r.gates[0].message).toContain('2026-10-06');
  });

  it('una misión ya despachada no se vuelve a despachar', () => {
    expect(buildDispatchGates({ ...okInput(), mission: { status: 'despachada' } }).blockedBy).toEqual(['schedule']);
  });

  it('un período de descanso abierto bloquea; uno de servicio se reutiliza', () => {
    expect(buildDispatchGates({ ...okInput(), openPeriodType: 'descanso' }).blockedBy).toEqual(['duty']);
    expect(buildDispatchGates({ ...okInput(), openPeriodType: 'servicio' }).canDispatch).toBe(true);
  });

  it('sin aeronave asignada bloquea, con mensaje accionable', () => {
    const r = buildDispatchGates({ ...okInput(), aircraft: { assigned: false } });
    expect(r.blockedBy).toEqual(['aircraft']);
    expect(r.gates.find((g) => g.id === 'aircraft').message).toContain('Programación');
  });

  it('sin evaluación de póliza no inventa el gate', () => {
    expect(buildDispatchGates({ ...okInput(), insurance: null }).gates.some((g) => g.id === 'insurance')).toBe(false);
  });
});

const tolerability = [
  { probabilityCode: '1', severityCode: 'A', zone: 'aceptable' },
  { probabilityCode: '1', severityCode: 'B', zone: 'tolerable' },
  { probabilityCode: '2', severityCode: 'B', zone: 'inaceptable' },
  { probabilityCode: '3', severityCode: 'A', zone: 'aceptable' },
];

describe('evaluateDispatchRisk', () => {
  it('aceptable: sin exigencias y sin guardar barreras', () => {
    const r = evaluateDispatchRisk({ tolerability, probabilityCode: '1', severityCode: 'A', mitigation: 'ignorada' });
    expect(r).toMatchObject({ ok: true, initialZone: 'aceptable', needsMitigation: false, voluntaryMitigation: false, storedMitigation: null });
  });

  it('tolerable: mitigar es voluntario', () => {
    expect(evaluateDispatchRisk({ tolerability, probabilityCode: '1', severityCode: 'B' })).toMatchObject({ ok: true, voluntaryMitigation: false, storedMitigation: null });
    const v = evaluateDispatchRisk({ tolerability, probabilityCode: '1', severityCode: 'B', mitigation: ' Observador adicional ' });
    expect(v).toMatchObject({ ok: true, voluntaryMitigation: true, storedMitigation: 'Observador adicional' });
  });

  it('inaceptable: exige barreras y residual', () => {
    const r = evaluateDispatchRisk({ tolerability, probabilityCode: '2', severityCode: 'B' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('barreras');
    expect(r.errors.join(' ')).toContain('residual');
  });

  it('inaceptable con residual que sigue inaceptable no pasa', () => {
    const r = evaluateDispatchRisk({ tolerability, probabilityCode: '2', severityCode: 'B', mitigation: 'x', residualProbabilityCode: '2', residualSeverityCode: 'B' });
    expect(r.ok).toBe(false);
    expect(r.residualZone).toBe('inaceptable');
  });

  it('inaceptable mitigado a aceptable pasa y guarda las barreras', () => {
    const r = evaluateDispatchRisk({ tolerability, probabilityCode: '2', severityCode: 'B', mitigation: 'Cambio de zona', residualProbabilityCode: '3', residualSeverityCode: 'A' });
    expect(r).toMatchObject({ ok: true, residualZone: 'aceptable', storedMitigation: 'Cambio de zona' });
  });

  it('combinación sin criterio en la matriz es un error, no una zona inventada', () => {
    const r = evaluateDispatchRisk({ tolerability, probabilityCode: '9', severityCode: 'Z' });
    expect(r.ok).toBe(false);
    expect(r.initialZone).toBeNull();
  });

  it('sin elegir probabilidad/gravedad pide elegirlas', () => {
    expect(evaluateDispatchRisk({ tolerability }).errors[0]).toContain('Elige');
  });
});

describe('buildChecklistItems', () => {
  const lists = [
    { id: 'c1', name: 'Pre-vuelo', version: '2', steps: ['Hélices', 'Batería'] },
    { id: 'c2', name: 'Briefing', steps: ['Zona'] },
  ];

  it('toma el texto del paso de la definición, no del cliente', () => {
    const r = buildChecklistItems(lists, { c1: [{ value: 'si' }, { value: 'no', note: ' hinchada ' }], c2: [{ value: 'na' }] });
    expect(r.complete).toBe(true);
    expect(r.items).toHaveLength(3);
    expect(r.items[1]).toMatchObject({ checklist_id: 'c1', checklist_name: 'Pre-vuelo', checklist_version: '2', position: 1, step_text: 'Batería', value: 'no', note: 'hinchada' });
    expect(r.items[2].checklist_version).toBeNull();
    expect(r.noCount).toBe(1);
  });

  it('un paso sin responder o con valor inválido deja el despacho incompleto', () => {
    const r = buildChecklistItems(lists, { c1: [{ value: 'si' }, { value: 'tal vez' }], c2: [] });
    expect(r.complete).toBe(false);
    expect(r.missing).toBe(2);
  });

  it('sin listas, está completo y vacío', () => {
    expect(buildChecklistItems([], {})).toMatchObject({ complete: true, items: [], noCount: 0 });
  });
});

describe('validateFlightClose', () => {
  const base = { dispatchedAt: '2026-10-05T14:00:00Z', takeoffAt: '2026-10-05T14:10:00Z', landingAt: '2026-10-05T15:25:00Z', now: '2026-10-05T15:30:00Z' };

  it('calcula las horas reales con 2 decimales', () => {
    expect(validateFlightClose(base)).toEqual({ ok: true, errors: [], totalTime: 1.25 });
  });
  it('aterrizaje anterior al despegue', () => {
    expect(validateFlightClose({ ...base, landingAt: '2026-10-05T14:05:00Z' }).ok).toBe(false);
  });
  it('despegue antes del despacho', () => {
    const r = validateFlightClose({ ...base, takeoffAt: '2026-10-05T13:00:00Z' });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toContain('despachó');
  });
  it('tolera un par de minutos de desfase de reloj', () => {
    expect(validateFlightClose({ ...base, takeoffAt: '2026-10-05T13:59:00Z' }).ok).toBe(true);
  });
  it('aterrizaje en el futuro', () => {
    expect(validateFlightClose({ ...base, landingAt: '2026-10-05T16:30:00Z' }).ok).toBe(false);
  });
  it('vuelo de más de 24 h no es plausible', () => {
    const r = validateFlightClose({ ...base, dispatchedAt: '2026-10-03T00:00:00Z', takeoffAt: '2026-10-03T00:00:00Z', landingAt: '2026-10-05T15:00:00Z' });
    expect(r.ok).toBe(false);
  });
  it('reporte de seguridad exige tipo VOR o MOR', () => {
    expect(validateFlightClose({ ...base, safetyReport: true }).ok).toBe(false);
    expect(validateFlightClose({ ...base, safetyReport: true, safetyReportType: 'MOR' }).ok).toBe(true);
    expect(validateFlightClose({ ...base, safetyReport: false }).ok).toBe(true);
  });
  it('fechas ilegibles piden las horas', () => {
    expect(validateFlightClose({ ...base, takeoffAt: '' }).errors[0]).toContain('despegue');
  });
});
