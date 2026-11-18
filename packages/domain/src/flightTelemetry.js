// Telemetría de vuelo para el replay: convierte los cuadros (frames) de un log DJI en una serie compacta y rica —posición,
// altura, velocidades, actitud, satélites GPS, señal del control, palancas, batería, modo de vuelo, cámara— más una lista de
// eventos y alertas, y la vuelve a leer para el visor. Todo puro y probado. Formato v2 «por columnas» (un arreglo por campo):
// pesa ~4 veces menos que una lista de objetos y las columnas sin dato se omiten. Los replays antiguos (lista de puntos
// {t, lat, lng, alt, speed, yaw, battery}) se siguen leyendo: `normalizeReplay` acepta ambos formatos.

export const REPLAY_VERSION = 2;
export const REPLAY_LIMITS = { maxPoints: 1500, maxEvents: 300, maxBytes: 700_000, maxLegacyPoints: 2000 };

// Columnas numéricas del formato v2 (clave → decimales con que se guarda).
const COLUMNS = {
  t: 1, lat: 6, lng: 6, alt: 1, spd: 1, vs: 1, yaw: 0, pit: 0, rol: 0, bat: 0, bv: 2, bt: 0, bc: 1,
  sat: 0, gl: 0, ds: 0, us: 0, ail: 2, ele: 2, thr: 2, rud: 2, gp: 0, mo: 0, gh: 0, rec: 0, mot: 0, gnd: 0, dh: 0,
};
export const REPLAY_COLUMN_KEYS = Object.keys(COLUMNS);

const round = (v, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);
const nameOf = (v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? `Desconocido ${Object.values(v)[0]}` : null);
const validLatLng = (la, lo) => typeof la === 'number' && typeof lo === 'number' && la !== 0 && lo !== 0 && Math.abs(la) <= 90 && Math.abs(lo) <= 180;

export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Palanca → -1..1. La librería entrega el valor crudo del control (≈364–1684, centro 1024) o ya normalizado (±100): se detecta por la escala. */
export function normalizeStick(raw) {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const v = Math.abs(raw) <= 110 ? raw / 100 : (raw - 1024) / 660;
  return Math.max(-1, Math.min(1, v));
}

// ── Textos en español ──────────────────────────────────────────────────────
const MODE_ES = {
  Manual: 'Manual', Atti: 'Actitud (sin GPS)', AttiCourseLock: 'Actitud, rumbo fijo', AttiHover: 'Estacionario sin GPS', Hover: 'Estacionario',
  GPSBlake: 'Frenado GPS', GPSAtti: 'GPS', GPSCourseLock: 'GPS, rumbo fijo', GPSHomeLock: 'GPS, bloqueo a casa', GPSHotPoint: 'Punto de interés',
  AssistedTakeoff: 'Despegue asistido', AutoTakeoff: 'Despegue automático', AutoLanding: 'Aterrizaje automático', AttiLanding: 'Aterrizaje sin GPS',
  GPSWaypoint: 'Misión de waypoints', GoHome: 'Regreso a casa', ClickGo: 'Vuelo por toque', Joystick: 'Control manual', GPSAttiWristband: 'GPS (pulsera)',
  Cinematic: 'Cinematográfico', AttiLimited: 'Actitud limitada', Draw: 'Dibujo de ruta', GPSFollowMe: 'Sígueme', ActiveTrack: 'ActiveTrack', TapFly: 'TapFly',
  Pano: 'Panorámica', Farming: 'Agricultura', FPV: 'FPV', GPSSport: 'Deportivo', GPSNovice: 'Principiante', ConfirmLanding: 'Confirmar aterrizaje',
  TerrainTracking: 'Seguimiento de terreno', NaviAdvGoHome: 'Regreso a casa avanzado', NaviAdvLanding: 'Aterrizaje avanzado', Tripod: 'Trípode',
  TrackHeadlock: 'Seguimiento con rumbo fijo', EngineStart: 'Arranque de motores', GPSGentle: 'Suave',
};
export const describeFlightMode = (name) => (name ? MODE_ES[name] || String(name).replace(/([a-z])([A-Z])/g, '$1 $2') : '—');

const ACTION_ES = {
  WarningPowerGoHome: 'Regreso por batería baja (advertencia)', WarningPowerLanding: 'Aterrizaje por batería baja (advertencia)',
  SmartPowerGoHome: 'Regreso automático por batería', SmartPowerLanding: 'Aterrizaje automático por batería',
  LowVoltageLanding: 'Aterrizaje por voltaje bajo', LowVoltageGoHome: 'Regreso por voltaje bajo', SeriousLowVoltageLanding: 'Aterrizaje por voltaje crítico',
  RCOnekeyGoHome: 'Regreso a casa con el botón del control', AppAutoGoHome: 'Regreso a casa desde la app', AppAutoLanding: 'Aterrizaje desde la app',
  OutOfControlGoHome: 'Regreso automático por pérdida de señal del control', RCAutoLanding: 'Aterrizaje automático desde el control',
  TooCloseGoHomeLanding: 'Regreso/aterrizaje: demasiado cerca de casa', TooFarGoHomeLanding: 'Regreso/aterrizaje: demasiado lejos de casa',
  AvoidGroundLanding: 'Aterrizaje evitado (suelo no apto)', AirportAvoidLanding: 'Aterrizaje evitado (zona de aeropuerto)', RCAutoTakeoff: 'Despegue automático',
  RCAssistantTakeoff: 'Despegue asistido', AppAutoTakeoff: 'Despegue desde la app', AppWPMission: 'Misión de waypoints',
};
const GOHOME_ES = { Standby: 'En espera', Preascending: 'Ascenso previo', Align: 'Alineando', Ascending: 'Ascendiendo', Cruise: 'Crucero', Braking: 'Frenando', Bypassing: 'Esquivando' };
export const describeGoHomeStatus = (name) => (name ? GOHOME_ES[name] || String(name) : '—');

// Banderas del cuadro OSD que, al activarse, son alertas.
const FLAGS = {
  isCompassError: ['Error de brújula', 2], isVibrating: ['Vibración excesiva', 1], isNotEnoughForce: ['Empuje insuficiente', 2], isOutOfLimit: ['Fuera del límite permitido', 1],
  isBarometerDeadInAir: ['Barómetro sin respuesta en el aire', 2], isPropellerCatapult: ['Hélice atascada o lanzada', 2], isMotorBlocked: ['Motor bloqueado', 2], isAcceletorOverRange: ['Acelerómetro fuera de rango', 1], waveError: ['Error de oleaje del sensor', 1],
};

/** Texto en español y gravedad de un evento ({t, k, m, s}). */
export function describeEvent(ev) {
  const k = ev?.k;
  const m = ev?.m;
  switch (k) {
    case 'despegue': return 'Despegue';
    case 'aterrizaje': return 'Aterrizaje';
    case 'motores': return m === 'on' ? 'Motores encendidos' : 'Motores apagados';
    case 'modo': return `Modo de vuelo: ${describeFlightMode(m)}`;
    case 'accion': return ACTION_ES[m] || `Acción automática: ${String(m).replace(/([a-z])([A-Z])/g, '$1 $2')}`;
    case 'rth': return `Regreso a casa: ${describeGoHomeStatus(m)}`;
    case 'home': return 'Punto de origen registrado';
    case 'gps_bajo': return 'Señal GPS débil (pocos satélites)';
    case 'gps_ok': return 'Señal GPS recuperada';
    case 'enlace_bajo': return 'Señal del control débil';
    case 'enlace_ok': return 'Señal del control recuperada';
    case 'bateria': return `Batería al ${m}%`;
    case 'voltaje': return `Advertencia de voltaje de batería (nivel ${m})`;
    case 'camara': return m === 'on' ? 'Inicio de grabación de video' : 'Fin de grabación de video';
    case 'bandera': return FLAGS[m]?.[0] || String(m);
    case 'app_aviso': return `Aviso de la app: ${m}`;
    case 'app_info': return `Mensaje de la app: ${m}`;
    default: return String(m ?? k ?? 'Evento');
  }
}

// Código meteorológico WMO (Open-Meteo) → texto.
const WMO_ES = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna intensa',
  56: 'Llovizna helada', 57: 'Llovizna helada intensa', 61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte', 66: 'Lluvia helada', 67: 'Lluvia helada fuerte', 71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve fuerte',
  77: 'Granizo fino', 80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos violentos', 85: 'Chubascos de nieve', 86: 'Chubascos de nieve fuertes', 95: 'Tormenta eléctrica', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo fuerte',
};
export const weatherCodeText = (code) => WMO_ES[code] || '—';

// ── Construcción desde los cuadros del log ────────────────────────────────
function pickEvents(frames, { maxEvents }) {
  const events = [];
  const last = {};
  const add = (t, k, m, s, dedupeKey) => {
    const key = dedupeKey || `${k}:${m}`;
    if (last[key] != null && t - last[key] < 2) return; // el mismo evento no se repite en menos de 2 s
    last[key] = t;
    events.push({ t: round(t, 1), k, m, s });
  };
  let prev = {};
  let batMark = 101;
  let gpsLow = false;
  let linkLow = false;
  for (const f of frames) {
    const o = f.osd || {};
    const t = o.flyTime;
    if (t == null) continue;
    const modeName = nameOf(o.flycState);
    if (modeName && modeName !== prev.mode) { if (prev.mode != null) add(t, 'modo', modeName, 0); prev.mode = modeName; }
    const act = nameOf(o.flightAction);
    if (act && act !== 'None' && act !== prev.act) { const bad = /Power|Voltage|OutOfControl|TooFar|TooClose/.test(act); add(t, 'accion', act, bad ? 2 : 1); }
    prev.act = act;
    const gh = nameOf(o.goHomeStatus);
    if (gh && gh !== 'Standby' && gh !== prev.gh && prev.gh != null) add(t, 'rth', gh, 1);
    if (gh) prev.gh = gh;
    if (typeof o.isMotorOn === 'boolean') { if (prev.motor != null && o.isMotorOn !== prev.motor) add(t, 'motores', o.isMotorOn ? 'on' : 'off', 0); prev.motor = o.isMotorOn; }
    if (typeof o.isOnGround === 'boolean') {
      if (prev.ground === true && o.isOnGround === false) add(t, 'despegue', '', 0);
      if (prev.ground === false && o.isOnGround === true) add(t, 'aterrizaje', '', 0);
      prev.ground = o.isOnGround;
    }
    if (f.home?.isHomeRecord && !prev.home) { prev.home = true; add(t, 'home', '', 0); }
    // GPS: pocos satélites
    if (typeof o.gpsNum === 'number') {
      const low = o.gpsNum < 6;
      if (low && !gpsLow) add(t, 'gps_bajo', String(o.gpsNum), 1, 'gps');
      if (!low && gpsLow) add(t, 'gps_ok', '', 0, 'gps');
      gpsLow = low;
    }
    const dl = f.rc?.downlinkSignal;
    const ul = f.rc?.uplinkSignal;
    if (typeof dl === 'number' || typeof ul === 'number') {
      const low = (typeof dl === 'number' && dl < 30) || (typeof ul === 'number' && ul < 30);
      if (low && !linkLow) add(t, 'enlace_bajo', '', 1, 'enlace');
      if (!low && linkLow) add(t, 'enlace_ok', '', 0, 'enlace');
      linkLow = low;
    }
    const bat = f.battery?.chargeLevel;
    if (typeof bat === 'number') {
      for (const mark of [30, 20, 10]) if (bat <= mark && batMark > mark) add(t, 'bateria', String(mark), mark <= 20 ? 2 : 1, `bat${mark}`);
      batMark = Math.min(batMark, bat);
    }
    if (o.voltageWarning > 0 && !(prev.vw > 0)) add(t, 'voltaje', String(o.voltageWarning), 2);
    prev.vw = o.voltageWarning;
    if (typeof f.camera?.isVideo === 'boolean') { if (prev.rec != null && f.camera.isVideo !== prev.rec) add(t, 'camara', f.camera.isVideo ? 'on' : 'off', 0); prev.rec = f.camera.isVideo; }
    for (const flag of Object.keys(FLAGS)) {
      if (o[flag] === true && !prev[flag]) add(t, 'bandera', flag, FLAGS[flag][1]);
      prev[flag] = o[flag] === true;
    }
    const warn = f.app?.warn;
    const tip = f.app?.tip;
    if (warn && warn !== prev.warn) add(t, 'app_aviso', String(warn).slice(0, 120), 2);
    prev.warn = warn || '';
    if (tip && tip !== prev.tip) add(t, 'app_info', String(tip).slice(0, 120), 0);
    prev.tip = tip || '';
  }
  return events.slice(0, maxEvents);
}

/**
 * @param {object[]} frames cuadros del log (salida de `parser.frames()`).
 * @returns {null | object} replay v2 (columnas + eventos + resumen) o null si no hay al menos 2 puntos con GPS.
 */
export function buildTelemetryTrack(frames, { maxPoints = REPLAY_LIMITS.maxPoints, maxEvents = REPLAY_LIMITS.maxEvents } = {}) {
  if (!Array.isArray(frames) || !frames.length) return null;
  const gps = frames.filter((f) => validLatLng(f.osd?.latitude, f.osd?.longitude) && f.osd.flyTime != null);
  if (gps.length < 2) return null;

  const duration = gps[gps.length - 1].osd.flyTime - gps[0].osd.flyTime;
  const stepS = Math.max(1, Math.ceil(duration / maxPoints)); // ≥ 1 punto por segundo, y a lo sumo `maxPoints`
  const picked = [];
  let nextT = -Infinity;
  for (const f of gps) {
    if (f.osd.flyTime >= nextT) { picked.push(f); nextT = f.osd.flyTime + stepS; }
  }
  if (picked[picked.length - 1] !== gps[gps.length - 1]) picked.push(gps[gps.length - 1]);

  const homeFrame = frames.find((f) => f.home?.isHomeRecord && validLatLng(f.home.latitude, f.home.longitude));
  const home = homeFrame ? { lat: homeFrame.home.latitude, lng: homeFrame.home.longitude } : { lat: picked[0].osd.latitude, lng: picked[0].osd.longitude };

  const modes = [];
  const ghs = [];
  const idx = (list, name) => { if (!name) return null; let i = list.indexOf(name); if (i < 0) { list.push(name); i = list.length - 1; } return i; };
  const cols = Object.fromEntries(REPLAY_COLUMN_KEYS.map((k) => [k, []]));
  const t0 = picked[0].osd.flyTime;
  for (const f of picked) {
    const o = f.osd;
    const b = f.battery || {};
    const rc = f.rc || {};
    const row = {
      t: o.flyTime - t0, lat: o.latitude, lng: o.longitude,
      alt: o.height ?? o.altitude,
      spd: Math.hypot(o.xSpeed ?? 0, o.ySpeed ?? 0),
      vs: o.zSpeed,
      yaw: o.yaw, pit: o.pitch, rol: o.roll,
      bat: b.chargeLevel, bv: b.voltage, bt: b.temperature, bc: b.current,
      sat: o.gpsNum, gl: o.gpsLevel, ds: rc.downlinkSignal, us: rc.uplinkSignal,
      ail: normalizeStick(rc.aileron), ele: normalizeStick(rc.elevator), thr: normalizeStick(rc.throttle), rud: normalizeStick(rc.rudder),
      gp: f.gimbal?.pitch,
      mo: idx(modes, nameOf(o.flycState)), gh: idx(ghs, nameOf(o.goHomeStatus)),
      rec: typeof f.camera?.isVideo === 'boolean' ? Number(f.camera.isVideo) : null,
      mot: typeof o.isMotorOn === 'boolean' ? Number(o.isMotorOn) : null,
      gnd: typeof o.isOnGround === 'boolean' ? Number(o.isOnGround) : null,
      dh: haversineM(home.lat, home.lng, o.latitude, o.longitude),
    };
    for (const k of REPLAY_COLUMN_KEYS) cols[k].push(round(row[k], COLUMNS[k]));
  }
  // Una columna sin ningún dato se omite (p. ej. señal del control en modelos que no la reportan).
  const out = { v: REPLAY_VERSION, n: picked.length };
  for (const k of REPLAY_COLUMN_KEYS) if (cols[k].some((x) => x != null)) out[k] = cols[k];
  out.modes = modes;
  out.ghs = ghs;
  out.home = { lat: round(home.lat, 6), lng: round(home.lng, 6) };
  const events = pickEvents(frames, { maxEvents }).map((e) => ({ ...e, t: round(e.t - t0, 1) })).filter((e) => e.t >= -1);
  out.events = events.map((e) => ({ ...e, t: Math.max(0, e.t) }));
  return out;
}

// ── Lectura (visor y validación) ──────────────────────────────────────────
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Replay guardado (formato v2 o lista antigua de puntos) → { points, events, home, modes, ghs, has, legacy }. */
export function normalizeReplay(raw) {
  if (Array.isArray(raw)) {
    const points = raw.filter((p) => p && validLatLng(p.lat, p.lng)).map((p) => ({ t: num(p.t) ?? 0, lat: p.lat, lng: p.lng, alt: num(p.alt), spd: num(p.speed), speed: num(p.speed), yaw: num(p.yaw), bat: num(p.battery), battery: num(p.battery) }));
    const t0 = points[0]?.t ?? 0;
    for (const p of points) p.t = Math.round((p.t - t0) * 10) / 10;
    return { points, events: [], home: points[0] ? { lat: points[0].lat, lng: points[0].lng } : null, modes: [], ghs: [], has: hasMap(points), legacy: true };
  }
  if (raw && typeof raw === 'object' && raw.v === REPLAY_VERSION && Array.isArray(raw.t) && Array.isArray(raw.lat) && Array.isArray(raw.lng)) {
    const n = raw.t.length;
    const points = [];
    for (let i = 0; i < n; i++) {
      const p = {};
      for (const k of REPLAY_COLUMN_KEYS) p[k] = Array.isArray(raw[k]) ? num(raw[k][i]) : null;
      p.speed = p.spd;
      p.battery = p.bat;
      if (validLatLng(p.lat, p.lng)) points.push(p);
    }
    const events = (Array.isArray(raw.events) ? raw.events : []).map((e) => ({ t: num(e.t) ?? 0, k: String(e.k), m: e.m == null ? '' : String(e.m), s: [0, 1, 2].includes(e.s) ? e.s : 0 }));
    return { points, events, home: raw.home && validLatLng(raw.home.lat, raw.home.lng) ? raw.home : points[0] ? { lat: points[0].lat, lng: points[0].lng } : null, modes: raw.modes || [], ghs: raw.ghs || [], has: hasMap(points), legacy: false };
  }
  return { points: [], events: [], home: null, modes: [], ghs: [], has: {}, legacy: true };
}

function hasMap(points) {
  const has = {};
  for (const k of REPLAY_COLUMN_KEYS) has[k] = points.some((p) => p[k] != null);
  return has;
}

/** Resumen del vuelo a partir de los puntos (máximos, mínimos y recorrido). */
export function summarizeReplay(points) {
  if (!points.length) return null;
  const vals = (k) => points.map((p) => p[k]).filter((x) => x != null);
  const max = (k) => { const v = vals(k); return v.length ? Math.max(...v) : null; };
  const min = (k) => { const v = vals(k); return v.length ? Math.min(...v) : null; };
  let dist = 0;
  for (let i = 1; i < points.length; i++) dist += haversineM(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  return {
    durationS: points[points.length - 1].t - points[0].t, distanceM: Math.round(dist), maxAlt: max('alt'), maxSpeed: max('spd'), maxDistHome: max('dh'),
    satsMin: min('sat'), satsMax: max('sat'), batStart: points[0].bat, batEnd: points[points.length - 1].bat, minSignal: min('ds'), maxTemp: max('bt'),
  };
}

/** Valores en el instante `t` (segundos): números interpolados, el resto del punto anterior. */
export function sampleAt(points, t) {
  if (!points.length) return null;
  if (t <= points[0].t) return { ...points[0], index: 0 };
  const last = points.length - 1;
  if (t >= points[last].t) return { ...points[last], index: last };
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (points[mid].t <= t) lo = mid; else hi = mid; }
  const a = points[lo];
  const b = points[hi];
  const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
  const out = { ...a, index: lo, t };
  for (const k of ['lat', 'lng', 'alt', 'spd', 'vs', 'pit', 'rol', 'bv', 'bc', 'ail', 'ele', 'thr', 'rud', 'dh', 'gp']) {
    if (a[k] != null && b[k] != null) out[k] = a[k] + (b[k] - a[k]) * f;
  }
  if (a.yaw != null && b.yaw != null) { let d = b.yaw - a.yaw; if (d > 180) d -= 360; if (d < -180) d += 360; out.yaw = a.yaw + d * f; }
  out.speed = out.spd;
  return out;
}

/**
 * Valida y SANEA lo que el cliente manda como replay al registrar un vuelo: solo se guardan columnas conocidas, números
 * finitos y textos cortos; nada de objetos arbitrarios. Acepta el formato v2 o la lista antigua de puntos.
 * @returns {{ ok: true, value: any } | { ok: false, error: string }}
 */
export function validateReplayPayload(raw) {
  if (Array.isArray(raw)) {
    if (raw.length < 2 || raw.length > REPLAY_LIMITS.maxLegacyPoints) return { ok: false, error: 'La traza del replay tiene un tamaño no válido' };
    const ok = raw.every((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number' && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180);
    return ok ? { ok: true, value: raw } : { ok: false, error: 'La traza del replay tiene puntos no válidos' };
  }
  if (!raw || typeof raw !== 'object' || raw.v !== REPLAY_VERSION) return { ok: false, error: 'Formato de replay no reconocido' };
  const n = Array.isArray(raw.t) ? raw.t.length : 0;
  if (n < 2 || n > REPLAY_LIMITS.maxPoints + 1) return { ok: false, error: 'La traza del replay tiene un tamaño no válido' };
  const value = { v: REPLAY_VERSION, n };
  for (const k of REPLAY_COLUMN_KEYS) {
    if (raw[k] === undefined) continue;
    if (!Array.isArray(raw[k]) || raw[k].length !== n) return { ok: false, error: `Columna «${k}» del replay no válida` };
    value[k] = raw[k].map((x) => num(x));
  }
  if (!value.lat || !value.lng || !value.t) return { ok: false, error: 'El replay necesita tiempo y posición' };
  if (!value.lat.every((x, i) => x != null && value.lng[i] != null && Math.abs(x) <= 90 && Math.abs(value.lng[i]) <= 180)) return { ok: false, error: 'La traza del replay tiene puntos no válidos' };
  const strList = (a) => (Array.isArray(a) ? a.slice(0, 64).map((s) => String(s).slice(0, 60)) : []);
  value.modes = strList(raw.modes);
  value.ghs = strList(raw.ghs);
  value.home = raw.home && validLatLng(raw.home.lat, raw.home.lng) ? { lat: raw.home.lat, lng: raw.home.lng } : null;
  value.events = (Array.isArray(raw.events) ? raw.events : []).slice(0, REPLAY_LIMITS.maxEvents).map((e) => ({ t: num(e?.t) ?? 0, k: String(e?.k ?? '').slice(0, 24), m: String(e?.m ?? '').slice(0, 120), s: [0, 1, 2].includes(e?.s) ? e.s : 0 }));
  if (JSON.stringify(value).length > REPLAY_LIMITS.maxBytes) return { ok: false, error: 'El replay pesa demasiado' };
  return { ok: true, value };
}
