import { describe, it, expect } from 'vitest';
import { buildTelemetryTrack, normalizeReplay, validateReplayPayload, sampleAt, summarizeReplay, normalizeStick, haversineM, describeEvent, describeFlightMode, weatherCodeText, REPLAY_LIMITS } from './flightTelemetry.js';

// Vuelo sintético: 120 s a 10 cuadros/s, sale hacia el norte y vuelve; batería de 90 a 18 %, satélites que bajan a 4, un aviso de la app.
function frames({ withRc = true, seconds = 120 } = {}) {
  const out = [];
  for (let i = 0; i <= seconds * 10; i++) {
    const t = i / 10;
    const phase = t < seconds / 2 ? t / (seconds / 2) : 1 - (t - seconds / 2) / (seconds / 2);
    out.push({
      custom: { dateTime: '2026-11-12T10:00:00Z' },
      osd: {
        flyTime: t, latitude: 4.6 + phase * 0.002, longitude: -74.08, height: 30 * phase, xSpeed: 0, ySpeed: 5, zSpeed: 0.5, yaw: 10, pitch: -3, roll: 2,
        gpsNum: t > 60 && t < 70 ? 4 : 14, gpsLevel: 5, flycState: t < 5 ? 'AutoTakeoff' : t > 100 ? 'GoHome' : 'GPSAtti', flightAction: 'None', goHomeStatus: 'Standby',
        isMotorOn: true, isOnGround: t < 2 || t > seconds - 1, voltageWarning: 0, isVibrating: t > 40 && t < 41,
      },
      battery: { chargeLevel: Math.round(90 - (72 * t) / seconds), voltage: 15.2, current: 8.5, temperature: 31 },
      rc: withRc ? { downlinkSignal: t > 80 ? 20 : 90, uplinkSignal: 95, aileron: 1024 + 330, elevator: 1024, throttle: 1024 - 660, rudder: 1024 } : {},
      gimbal: { pitch: -45 }, camera: { isVideo: t > 10 && t < 100 }, home: { isHomeRecord: t > 1, latitude: 4.6, longitude: -74.08 },
      app: { tip: t > 20 && t < 25 ? 'Aterrizando' : '', warn: t > 50 && t < 52 ? 'Señal débil' : '' },
    });
  }
  return out;
}

describe('buildTelemetryTrack', () => {
  const track = buildTelemetryTrack(frames());
  it('genera el formato v2 por columnas con 1 punto por segundo', () => {
    expect(track.v).toBe(2);
    expect(track.n).toBe(121);
    expect(track.t).toHaveLength(121);
    expect(track.t[0]).toBe(0);
    expect(track.t[120]).toBe(120);
    for (const k of ['lat', 'lng', 'alt', 'spd', 'bat', 'sat', 'ds', 'ail', 'thr', 'dh']) expect(track[k]).toHaveLength(121);
  });
  it('normaliza las palancas a -1..1 desde el valor crudo del control', () => {
    expect(track.ail[0]).toBe(0.5); // 1354 → +330/660
    expect(track.ele[0]).toBe(0);
    expect(track.thr[0]).toBe(-1);
  });
  it('omite las columnas sin datos (modelo sin señal de control)', () => {
    const t = buildTelemetryTrack(frames({ withRc: false }));
    expect(t.ds).toBeUndefined();
    expect(t.ail).toBeUndefined();
    expect(t.sat).toBeDefined();
  });
  it('calcula la distancia a casa y la guarda', () => {
    expect(track.dh[0]).toBeLessThan(5);
    expect(Math.max(...track.dh)).toBeGreaterThan(200); // ~0.002° ≈ 222 m
  });
  it('registra eventos: despegue, modos, avisos de la app, GPS débil, enlace débil, batería, vibración', () => {
    const kinds = track.events.map((e) => e.k);
    for (const k of ['despegue', 'aterrizaje', 'modo', 'app_aviso', 'app_info', 'gps_bajo', 'gps_ok', 'enlace_bajo', 'bateria', 'bandera', 'camara', 'home']) expect(kinds).toContain(k);
    const warn = track.events.find((e) => e.k === 'app_aviso');
    expect(warn).toMatchObject({ m: 'Señal débil', s: 2 });
    expect(track.events.filter((e) => e.k === 'bateria').map((e) => e.m)).toEqual(['30', '20']);
    expect(track.events.find((e) => e.k === 'bandera')).toMatchObject({ m: 'isVibrating', s: 1 });
    expect(track.events.every((e, i, a) => i === 0 || a[i - 1].t <= e.t)).toBe(true);
  });
  it('un vuelo largo no pasa del tope de puntos', () => {
    const long = buildTelemetryTrack(frames({ seconds: 4000 }), { maxPoints: 1500 });
    expect(long.n).toBeLessThanOrEqual(1502);
    expect(long.t[long.n - 1]).toBe(4000);
  });
  it('sin al menos 2 puntos con GPS devuelve null', () => {
    expect(buildTelemetryTrack([])).toBeNull();
    expect(buildTelemetryTrack([{ osd: { flyTime: 0, latitude: 0, longitude: 0 } }, { osd: { flyTime: 1, latitude: 0, longitude: 0 } }])).toBeNull();
  });
  it('el replay completo de 2 minutos pesa poco', () => {
    expect(JSON.stringify(track).length).toBeLessThan(40_000);
  });
});

describe('normalizeReplay / validateReplayPayload', () => {
  const track = buildTelemetryTrack(frames());
  it('ida y vuelta del formato v2', () => {
    const r = normalizeReplay(track);
    expect(r.legacy).toBe(false);
    expect(r.points).toHaveLength(121);
    expect(r.points[10]).toMatchObject({ speed: r.points[10].spd, battery: r.points[10].bat });
    expect(r.has.sat).toBe(true);
    expect(r.has.rec).toBe(true);
    expect(r.events.length).toBeGreaterThan(5);
    expect(r.home).toEqual({ lat: 4.6, lng: -74.08 });
  });
  it('lee el formato antiguo (lista de puntos) sin eventos', () => {
    const r = normalizeReplay([{ t: 100, lat: 4.6, lng: -74.1, alt: 10, speed: 3, yaw: 90, battery: 80 }, { t: 110, lat: 4.601, lng: -74.1, alt: 12, speed: 4, yaw: 90, battery: 79 }]);
    expect(r.legacy).toBe(true);
    expect(r.points.map((p) => p.t)).toEqual([0, 10]);
    expect(r.has.sat).toBe(false);
    expect(r.events).toEqual([]);
  });
  it('valida un replay correcto y lo devuelve saneado', () => {
    const v = validateReplayPayload({ ...track, basura: { x: 1 }, extra: [1, 2] });
    expect(v.ok).toBe(true);
    expect(v.value.basura).toBeUndefined();
    expect(v.value.extra).toBeUndefined();
    expect(v.value.t).toHaveLength(121);
  });
  it('rechaza columnas de largo distinto, posiciones inválidas, formato desconocido y exceso de tamaño', () => {
    expect(validateReplayPayload({ ...track, alt: [1, 2] }).ok).toBe(false);
    expect(validateReplayPayload({ ...track, lat: track.lat.map(() => 200) }).ok).toBe(false);
    expect(validateReplayPayload({ v: 3 }).ok).toBe(false);
    expect(validateReplayPayload(null).ok).toBe(false);
    const big = { v: 2, t: new Array(REPLAY_LIMITS.maxPoints + 50).fill(1), lat: [], lng: [] };
    expect(validateReplayPayload(big).ok).toBe(false);
  });
  it('acepta la lista antigua y rechaza una vacía o con puntos malos', () => {
    expect(validateReplayPayload([{ lat: 1, lng: 1 }, { lat: 1.1, lng: 1 }]).ok).toBe(true);
    expect(validateReplayPayload([{ lat: 1, lng: 1 }]).ok).toBe(false);
    expect(validateReplayPayload([{ lat: 99, lng: 1 }, { lat: 1, lng: 1 }]).ok).toBe(false);
  });
  it('recorta textos de eventos y limita su cantidad', () => {
    const many = Array.from({ length: 500 }, (_, i) => ({ t: i, k: 'app_info', m: 'x'.repeat(500), s: 9 }));
    const v = validateReplayPayload({ ...track, events: many });
    expect(v.value.events).toHaveLength(REPLAY_LIMITS.maxEvents);
    expect(v.value.events[0].m).toHaveLength(120);
    expect(v.value.events[0].s).toBe(0);
  });
});

describe('sampleAt / summarizeReplay', () => {
  const { points } = normalizeReplay(buildTelemetryTrack(frames()));
  it('interpola entre puntos', () => {
    const a = sampleAt(points, 30.5);
    expect(a.index).toBe(30);
    expect(a.alt).toBeGreaterThan(points[30].alt);
    expect(a.alt).toBeLessThan(points[31].alt);
  });
  it('en los extremos devuelve el primer y el último punto; el rumbo cruza 360 por el camino corto', () => {
    expect(sampleAt(points, -5).index).toBe(0);
    expect(sampleAt(points, 9999).index).toBe(points.length - 1);
    const yaw = sampleAt([{ t: 0, lat: 1, lng: 1, yaw: 350 }, { t: 10, lat: 1, lng: 1, yaw: 10 }], 5).yaw;
    expect(Math.abs(yaw - 360) % 360).toBeLessThan(0.001);
  });
  it('resume el vuelo', () => {
    const s = summarizeReplay(points);
    expect(s.durationS).toBe(120);
    expect(s.maxAlt).toBeCloseTo(30, 0);
    expect(s.satsMin).toBe(4);
    expect(s.batStart).toBe(90);
    expect(s.batEnd).toBe(18);
    expect(s.distanceM).toBeGreaterThan(400);
  });
});

describe('utilidades', () => {
  it('normalizeStick entiende valor crudo (≈364–1684) o ya normalizado (±100)', () => {
    expect(normalizeStick(1024)).toBe(0);
    expect(normalizeStick(1684)).toBe(1);
    expect(normalizeStick(364)).toBe(-1);
    expect(normalizeStick(50)).toBe(0.5);
    expect(normalizeStick(-100)).toBe(-1);
    expect(normalizeStick(null)).toBeNull();
  });
  it('haversine: 1° de latitud ≈ 111 km', () => {
    expect(Math.round(haversineM(0, 0, 1, 0) / 1000)).toBe(111);
  });
  it('textos en español', () => {
    expect(describeFlightMode('GoHome')).toBe('Regreso a casa');
    expect(describeEvent({ k: 'accion', m: 'SmartPowerGoHome' })).toMatch(/batería/);
    expect(describeEvent({ k: 'bandera', m: 'isCompassError' })).toBe('Error de brújula');
    expect(describeEvent({ k: 'bateria', m: '20' })).toBe('Batería al 20%');
    expect(weatherCodeText(63)).toBe('Lluvia');
    expect(weatherCodeText(999)).toBe('—');
  });
});
