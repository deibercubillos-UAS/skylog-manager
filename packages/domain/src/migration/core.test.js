import { describe, it, expect } from 'vitest';
import { dateOnly, colombiaInstant, colombiaDate, transformFlight, mapBatteryHealth, mapBatteryStatus, mapAircraftStatus, resolveBrandModel, modelKey, roleFromPilotRole, mapMembershipRole, transformSubscription, transformMission } from './core.js';

const ctx = { aircraft: (id) => (id === 'a1' ? 'A1' : null), pilotPerson: (id) => (id === 'k1' ? 'P1' : null), organization: (id) => (id === 'o1' ? 'O1' : null), mission: (id) => (id === 'm1' ? 'M1' : null) };
const flight = (o = {}) => ({ organization_id: 'o1', aircraft_id: 'a1', pilot_id: 'k1', flight_date: '2026-03-10', takeoff_time: '08:00:00', landing_time: '08:30:00', total_time: 0.5, line_of_sight: 'VLOS', visual_condition: 'VMC', imported: false, ...o });

describe('fechas y horas de Colombia', () => {
  it('dateOnly acepta string y Date', () => {
    expect(dateOnly('2026-03-10')).toBe('2026-03-10');
    expect(dateOnly(new Date('2026-03-10T00:00:00Z'))).toBe('2026-03-10');
    expect(dateOnly(null)).toBeNull();
    expect(dateOnly('basura')).toBeNull();
  });
  it('08:00 en Colombia = 13:00 UTC', () => {
    expect(colombiaInstant('2026-03-10', '08:00:00')).toBe('2026-03-10T13:00:00.000Z');
    expect(colombiaInstant('2026-03-10', '23:30')).toBe('2026-03-11T04:30:00.000Z');
    expect(colombiaInstant('2026-03-10', null)).toBeNull();
  });
  it('un vencimiento en UTC se lee como fecha de Colombia', () => {
    expect(colombiaDate('2026-12-31T03:00:00Z')).toBe('2026-12-30'); // 22:00 del 30 en Bogotá
    expect(colombiaDate('2026-12-31T12:00:00Z')).toBe('2026-12-31');
    expect(colombiaDate(null)).toBeNull();
  });
});

describe('transformFlight', () => {
  it('vuelo normal', () => {
    const r = transformFlight(flight(), ctx);
    expect(r.ok).toBe(true);
    expect(r.row).toMatchObject({ organization_id: 'O1', pilot_person_id: 'P1', aircraft_id: 'A1', takeoff_at: '2026-03-10T13:00:00.000Z', landing_at: '2026-03-10T13:30:00.000Z', total_time: 0.5, visual_condition: 'VLOS', flight_rules: 'VMC', source: 'manual' });
    expect(r.warnings).toEqual([]);
  });
  it('cruza la medianoche: suma un día al aterrizaje', () => {
    const r = transformFlight(flight({ takeoff_time: '23:30:00', landing_time: '00:15:00', total_time: 0.75 }), ctx);
    expect(r.row.landing_at).toBe('2026-03-11T05:15:00.000Z');
    expect(r.warnings).toEqual([]);
  });
  it('aterrizaje igual al despegue sin duración: 0 minutos, se omite (no un vuelo de 24 h)', () => {
    expect(transformFlight(flight({ takeoff_time: '10:00:00', landing_time: '10:00:00', total_time: 0 }), ctx)).toMatchObject({ ok: false, reason: 'duración de 0 minutos' });
  });
  it('aterrizaje anterior al despegue: cruce de medianoche solo si dura ≤ 6 h o concuerda con total_time', () => {
    expect(transformFlight(flight({ takeoff_time: '22:00:00', landing_time: '04:00:00', total_time: null }), ctx).ok).toBe(true); // 6 h
    expect(transformFlight(flight({ takeoff_time: '22:00:00', landing_time: '03:00:00', total_time: 0 }), ctx).ok).toBe(true); // 5 h
    expect(transformFlight(flight({ takeoff_time: '10:00:00', landing_time: '09:00:00', total_time: null }), ctx).ok).toBe(false); // 23 h: no es creíble
    expect(transformFlight(flight({ takeoff_time: '10:00:00', landing_time: '09:00:00', total_time: 23 }), ctx).ok).toBe(true); // el dato de duración lo respalda
  });
  it('sin aterrizaje: se calcula desde la duración y se avisa', () => {
    const r = transformFlight(flight({ landing_time: null, total_time: 1 }), ctx);
    expect(r.row.landing_at).toBe('2026-03-10T14:00:00.000Z');
    expect(r.warnings).toContain('aterrizaje calculado desde la duración');
  });
  it('sin duración: se calcula desde las horas; sin nada, se omite', () => {
    expect(transformFlight(flight({ total_time: null }), ctx).row.total_time).toBe(0.5);
    expect(transformFlight(flight({ total_time: 0, landing_time: null }), ctx)).toMatchObject({ ok: false });
  });
  it('duración y horas inconsistentes: se conserva y se avisa', () => {
    const r = transformFlight(flight({ total_time: 1 }), ctx);
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toMatch(/no coincide/);
  });
  it('omite sin hora de despegue, aeronave no migrada u organización desconocida', () => {
    expect(transformFlight(flight({ takeoff_time: null }), ctx)).toMatchObject({ ok: false, reason: expect.stringMatching(/despegue/) });
    expect(transformFlight(flight({ aircraft_id: 'zz' }), ctx)).toMatchObject({ ok: false, reason: 'aeronave no migrada' });
    expect(transformFlight(flight({ organization_id: 'zz' }), ctx)).toMatchObject({ ok: false, reason: 'organización no migrada' });
  });
  it('sin piloto o piloto no migrado: marca «sin asignar»', () => {
    expect(transformFlight(flight({ pilot_id: null }), ctx)).toMatchObject({ ok: true, unassigned: true });
    expect(transformFlight(flight({ pilot_id: 'zz' }), ctx).unassigned).toBe(true);
  });
  it('línea de vista y reglas de vuelo van a columnas distintas', () => {
    const r = transformFlight(flight({ line_of_sight: 'bvlos', visual_condition: 'NIGHT' }), ctx);
    expect(r.row).toMatchObject({ visual_condition: 'BVLOS', flight_rules: 'NIGHT' });
    const none = transformFlight(flight({ line_of_sight: null, visual_condition: 'XYZ' }), ctx);
    expect(none.row.visual_condition).toBeUndefined();
    expect(none.row.flight_rules).toBeNull();
    expect(none.warnings.join()).toMatch(/línea de vista/);
  });
  it('N.° de misión → external_ref (o número de vuelo), importado → source, alertas y misión enlazada', () => {
    const r = transformFlight(flight({ mission_id: 'M-12', imported: true, has_alerts: true, alerts_json: [{ a: 1 }], auth_id: 'm1', replay_path: 'orgs/x/replays/1.json.gz' }), ctx);
    expect(r.row).toMatchObject({ external_ref: 'M-12', source: 'importado', alerts: [{ a: 1 }], mission_id: 'M1' });
    expect(r.replaySource).toBe('orgs/x/replays/1.json.gz');
    expect(transformFlight(flight({ flight_number: 'F-7' }), ctx).row.external_ref).toBe('F-7');
  });
});

describe('baterías, aeronaves, marcas', () => {
  it('salud por porcentaje', () => {
    expect(mapBatteryHealth(100).value).toBe('buena');
    expect(mapBatteryHealth(80).value).toBe('buena');
    expect(mapBatteryHealth(79).value).toBe('regular');
    expect(mapBatteryHealth(49).value).toBe('mala');
    expect(mapBatteryHealth(null).warning).toBeTruthy();
  });
  it('estado de batería', () => {
    expect(mapBatteryStatus('Baja')).toBe('baja');
    expect(mapBatteryStatus('Operativo')).toBe('operativo');
    expect(mapBatteryStatus(null)).toBe('operativo');
  });
  it('estado de aeronave: la baja manda', () => {
    expect(mapAircraftStatus({ baja_date: '2025-01-01', operational_status: 'disponible' }).operational_status).toBe('fuera_de_servicio');
    expect(mapAircraftStatus({ operational_status: 'en_mantenimiento' }).operational_status).toBe('en_mantenimiento');
    expect(mapAircraftStatus({}).operational_status).toBe('disponible');
  });
  it('marca: nunca se inventa', () => {
    const catalog = [{ brand: 'DJI', model: 'Mavic 3 Enterprise' }];
    expect(resolveBrandModel({ brand: 'Autel', model: 'Evo' }, catalog)).toEqual({ brand: 'Autel', model: 'Evo' });
    expect(resolveBrandModel({ brand: '', model: 'mavic 3 enterprise' }, catalog)).toMatchObject({ brand: 'DJI', inferred: true });
    expect(resolveBrandModel({ brand: '', model: 'Rarísimo' }, catalog)).toMatchObject({ brand: 'Sin definir', unresolved: true });
  });
  it('llave de modelo sin importar mayúsculas', () => {
    expect(modelKey('o', 'DJI ', 'Mini 3')).toBe(modelKey('o', 'dji', 'mini 3'));
  });
});

describe('roles y suscripciones', () => {
  it('cargo de un tripulante sin cuenta', () => {
    expect(roleFromPilotRole('Gerente General').role).toBe('admin');
    expect(roleFromPilotRole('Jefe de Pilotos').role).toBe('jefe_pilotos');
    expect(roleFromPilotRole('Gerente SMS').role).toBe('gerente_sms');
    expect(roleFromPilotRole('Piloto').role).toBe('piloto');
    expect(roleFromPilotRole('').role).toBe('piloto');
    expect(roleFromPilotRole('Observador').warning).toBeTruthy();
    expect(roleFromPilotRole('jefe_pilotos').role).toBe('jefe_pilotos');
  });
  it('rol de membresía', () => {
    expect(mapMembershipRole('admin').role).toBe('admin');
    expect(mapMembershipRole('raro').warning).toBeTruthy();
  });
  it('suscripción: plan, vencimiento en fecha de Colombia, sin recurrencia de ePayco', () => {
    const r = transformSubscription({ subscription_plan: 'escuadrilla', subscription_expires_at: '2026-08-01T03:00:00Z', epayco_subscription_id: 'sub1' }, new Date('2026-10-06'));
    expect(r.row).toMatchObject({ plan: 'escuadrilla', expires_at: '2026-07-31', payment_provider: null, wompi_payment_source_id: null });
    expect(r.flags.join()).toMatch(/vencida/);
    expect(r.flags.join()).toMatch(/ePayco/);
  });
  it('Enterprise sin vencimiento y con Wompi', () => {
    const r = transformSubscription({ subscription_plan: 'enterprise', subscription_expires_at: null, payment_provider: 'wompi', wompi_payment_source_id: '123' });
    expect(r.row).toMatchObject({ plan: 'enterprise', expires_at: null, payment_provider: 'wompi', wompi_payment_source_id: '123' });
    expect(r.flags).toEqual([]);
  });
  it('sin Gerente General: se omite y se informa; plan desconocido → piloto', () => {
    expect(transformSubscription(null)).toMatchObject({ skip: true });
    expect(transformSubscription({ subscription_plan: 'xyz' }).row.plan).toBe('piloto');
  });
});

describe('transformMission', () => {
  const auth = (o = {}) => ({ id: 'm1', organization_id: 'o1', pilot_id: 'k1', aircraft_id: 'a1', location: 'Madrid, Cundinamarca', scheduled_at: '2026-04-02T05:00:00Z', status: 'realizado', mission_id: 'MS-4', line_of_sight: 'VLOS', plan_data: { op_name: 'Inspección torre', geo_type: 'circle', points: [[4.7, -74.2]], radius: 150, altitude: 90, notes: 'sin novedad' }, ...o });
  it('misión realizada con su zona, altitud y notas', () => {
    const r = transformMission(auth(), ctx);
    expect(r.ok).toBe(true);
    expect(r.row).toMatchObject({ organization_id: 'O1', pic_person_id: 'P1', aircraft_id: 'A1', name: 'Inspección torre', zone: 'Madrid, Cundinamarca', status: 'cerrada', altitude_agl_m: 90, line_of_sight: 'VLOS', notes: 'sin novedad' });
    expect(r.row.zone_geo).toEqual({ geo_type: 'circle', points: [[4.7, -74.2]], radius: 150 });
    expect(r.warnings).toEqual([]);
  });
  it('estados: autorizado→programada, cancelado→cancelada, desconocido→programada con aviso', () => {
    expect(transformMission(auth({ status: 'autorizado' }), ctx).row.status).toBe('programada');
    expect(transformMission(auth({ status: 'cancelado', cancellation_notes: 'lluvia', plan_data: null }), ctx).row).toMatchObject({ status: 'cancelada', notes: 'lluvia' });
    const raro = transformMission(auth({ status: 'raro' }), ctx);
    expect(raro.row.status).toBe('programada');
    expect(raro.warnings.join()).toMatch(/sin equivalente/);
  });
  it('sin plan_data: nombre por N.° de misión o tipo; zona genérica; sin geometría', () => {
    const r = transformMission(auth({ plan_data: null, location: '' }), ctx);
    expect(r.row).toMatchObject({ name: 'MS-4', zone: 'Sin zona (migrada)', zone_geo: null, altitude_agl_m: null });
    expect(transformMission(auth({ plan_data: '{no json', mission_id: null, mission_type: 'Inspección' }), ctx).row.name).toBe('Inspección');
    expect(transformMission(auth({ plan_data: null, mission_id: null, mission_type: null }), ctx).row.name).toBe('Misión migrada');
  });
  it('piloto no migrado → sin asignar; aeronave no migrada → sin aeronave; guarda el N.° de AeroCivil aparte', () => {
    const r = transformMission(auth({ pilot_id: 'zz', aircraft_id: 'zz', aerocivil_auth_number: 'AC-9' }), ctx);
    expect(r.unassigned).toBe(true);
    expect(r.row.aircraft_id).toBeNull();
    expect(r.aerocivilAuthNumber).toBe('AC-9');
  });
  it('se omite sin organización o sin fecha', () => {
    expect(transformMission(auth({ organization_id: 'zz' }), ctx).ok).toBe(false);
    expect(transformMission(auth({ scheduled_at: null }), ctx).ok).toBe(false);
  });
});
