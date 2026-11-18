import { describe, it, expect } from 'vitest';
import { validateFlightReason, validateFlightFields, diffFlight, aircraftHoursAdjustments, voidHoursAdjustment } from './flightEdit.js';

describe('validateFlightReason', () => {
  it('exige un motivo de al menos 5 caracteres', () => {
    expect(validateFlightReason('').ok).toBe(false);
    expect(validateFlightReason('  ab ').ok).toBe(false);
    expect(validateFlightReason(null).ok).toBe(false);
    expect(validateFlightReason('  Hora mal cargada  ')).toEqual({ ok: true, reason: 'Hora mal cargada' });
  });
  it('rechaza motivos de más de 500 caracteres', () => {
    expect(validateFlightReason('x'.repeat(501)).ok).toBe(false);
  });
});

describe('validateFlightFields', () => {
  const base = { takeoff_at: '2026-11-12T15:00:00Z', landing_at: '2026-11-12T15:30:00Z', total_time: 0.5 };
  it('acepta un vuelo coherente', () => expect(validateFlightFields(base).ok).toBe(true));
  it('rechaza aterrizaje anterior o igual al despegue', () => {
    expect(validateFlightFields({ ...base, landing_at: base.takeoff_at }).ok).toBe(false);
    expect(validateFlightFields({ ...base, landing_at: '2026-11-12T14:00:00Z' }).ok).toBe(false);
  });
  it('rechaza una duración mayor que la ventana (con 6 min de margen)', () => {
    expect(validateFlightFields({ ...base, total_time: 0.6 }).ok).toBe(true);
    expect(validateFlightFields({ ...base, total_time: 0.7 }).ok).toBe(false);
    expect(validateFlightFields({ ...base, total_time: 0 }).ok).toBe(false);
  });
  it('rechaza fechas inválidas y valores fuera de catálogo', () => {
    expect(validateFlightFields({ ...base, takeoff_at: 'x' }).ok).toBe(false);
    expect(validateFlightFields({ ...base, visual_condition: 'XYZ' }).ok).toBe(false);
    expect(validateFlightFields({ ...base, flight_rules: 'IFR' }).ok).toBe(false);
    expect(validateFlightFields({ ...base, visual_condition: 'BVLOS', flight_rules: 'NIGHT' }).ok).toBe(true);
  });
});

describe('diffFlight', () => {
  it('lista solo lo que cambió', () => {
    const before = { takeoff_at: '2026-11-12T15:00:00+00:00', total_time: '0.50', notes: null, location: 'A' };
    const after = { takeoff_at: '2026-11-12T15:00:00Z', total_time: 0.5, notes: 'nota', location: 'B' };
    expect(diffFlight(before, after)).toEqual({ notes: { before: null, after: 'nota' }, location: { before: 'A', after: 'B' } });
  });
  it('detecta un cambio de hora real', () => {
    const d = diffFlight({ takeoff_at: '2026-11-12T15:00:00Z' }, { takeoff_at: '2026-11-12T20:00:00Z' });
    expect(Object.keys(d)).toEqual(['takeoff_at']);
  });
});

describe('aircraftHoursAdjustments', () => {
  it('misma aeronave: suma la diferencia', () => {
    expect(aircraftHoursAdjustments({ aircraft_id: 'a', total_time: '1.5' }, { aircraft_id: 'a', total_time: 2 })).toEqual([{ aircraftId: 'a', delta: 0.5 }]);
    expect(aircraftHoursAdjustments({ aircraft_id: 'a', total_time: 1 }, { aircraft_id: 'a', total_time: 0.4 })).toEqual([{ aircraftId: 'a', delta: -0.6 }]);
  });
  it('sin cambio de horas: nada que ajustar', () => {
    expect(aircraftHoursAdjustments({ aircraft_id: 'a', total_time: 1 }, { aircraft_id: 'a', total_time: 1 })).toEqual([]);
  });
  it('cambio de aeronave: resta a la anterior y suma a la nueva', () => {
    expect(aircraftHoursAdjustments({ aircraft_id: 'a', total_time: 1 }, { aircraft_id: 'b', total_time: 1 })).toEqual([
      { aircraftId: 'a', delta: -1 },
      { aircraftId: 'b', delta: 1 },
    ]);
  });
  it('sin aeronave antes o después', () => {
    expect(aircraftHoursAdjustments({ aircraft_id: null, total_time: 1 }, { aircraft_id: 'b', total_time: 2 })).toEqual([{ aircraftId: 'b', delta: 2 }]);
    expect(aircraftHoursAdjustments({ aircraft_id: 'a', total_time: 1 }, { aircraft_id: null, total_time: 1 })).toEqual([{ aircraftId: 'a', delta: -1 }]);
  });
});

describe('voidHoursAdjustment', () => {
  it('resta las horas del vuelo anulado a su aeronave', () => {
    expect(voidHoursAdjustment({ aircraft_id: 'a', total_time: '0.75' })).toEqual([{ aircraftId: 'a', delta: -0.75 }]);
    expect(voidHoursAdjustment({ aircraft_id: null, total_time: 1 })).toEqual([]);
  });
});
