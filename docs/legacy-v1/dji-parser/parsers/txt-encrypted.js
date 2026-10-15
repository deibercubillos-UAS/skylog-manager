/**
 * Parser for DJI Fly encrypted TXT flight records (version 13+).
 * Uses dji-log-parser-js (Rust/WASM) with a DJI API key for decryption.
 *
 * Requires: DJI_API_KEY in .env or environment.
 */

import { DJILog } from 'dji-log-parser-js';
import { readFileSync } from 'fs';

const API_KEY = process.env.DJI_API_KEY ?? null;

export function isEncryptedTxt(filePath) {
  try {
    const buf    = readFileSync(filePath);
    const parser = new DJILog(buf);
    return parser.version >= 13;
  } catch {
    return false;
  }
}

export async function parseTxtEncrypted(filePath) {
  if (!API_KEY) {
    throw new Error(
      'DJI_API_KEY no encontrada. Agrégala a dji-parser/.env:\n  DJI_API_KEY=tu_sdk_key'
    );
  }

  const buf    = readFileSync(filePath);
  const parser = new DJILog(buf);

  if (parser.version === 0) {
    throw new Error('El archivo no es un log DJI válido o no está soportado.');
  }

  let details = {};
  try { details = parser.details ?? {}; } catch { /* ignorar */ }

  const keychains = await parser.fetchKeychains(API_KEY);
  const frames    = parser.frames(keychains)  ?? [];
  const records   = parser.records(keychains) ?? [];

  // ── Tiempo ───────────────────────────────────────────────────
  const { fecha, hora_despegue } = parseDatetime(details.startTime);

  const lastFrameWithTime = [...frames].reverse().find(f =>
    f.custom?.dateTime && !f.custom.dateTime.startsWith('1970')
  );
  const hora_aterrizaje = lastFrameWithTime
    ? parseTimeOnly(lastFrameWithTime.custom.dateTime)
    : null;

  // ── GPS ───────────────────────────────────────────────────────
  const gpsFrame = frames.find(f =>
    f.osd?.latitude  && Math.abs(f.osd.latitude)  <= 90  && f.osd.latitude  !== 0 &&
    f.osd?.longitude && Math.abs(f.osd.longitude) <= 180 && f.osd.longitude !== 0
  );
  const validLat  = gpsFrame?.osd?.latitude  ?? null;
  const validLng  = gpsFrame?.osd?.longitude ?? null;
  const ubicacion = (validLat && validLng)
    ? `${validLat.toFixed(6)},${validLng.toFixed(6)}`
    : null;

  // ── Seriales ──────────────────────────────────────────────────
  // Primero details; si falla, toma del record Recover
  const recoverRec = records.find(r => r.type === 'Recover')?.content ?? {};
  const serial_aeronave = details.aircraftSn ?? recoverRec.aircraftSn ?? null;
  const serial_camara   = details.cameraSn   ?? recoverRec.cameraSn   ?? null;
  const serial_rc       = details.rcSn       ?? recoverRec.rcSn       ?? null;
  const serial_bateria  = details.batterySn  ?? recoverRec.batterySn  ?? null;

  // Serial largo del avión (con sufijo de variant, si existe)
  const compRec    = records.find(r => r.type === 'ComponentSerial' &&
                       r.content?.componentType === 'Aircraft');
  const serial_aeronave_full = compRec?.content?.serial ?? serial_aeronave;

  // ── Firmware versions ─────────────────────────────────────────
  const firmwares = {};
  for (const r of records.filter(r => r.type === 'Firmware')) {
    const sender = r.content?.senderType ?? 'Unknown';
    firmwares[sender] = r.content?.version ?? null;
  }

  // ── Batería (frames) ─────────────────────────────────────────
  const firstBatFrame = frames.find(f => f.battery?.chargeLevel != null);
  const lastBatFrame  = [...frames].reverse().find(f => f.battery?.chargeLevel != null);
  const batInicio     = firstBatFrame?.battery?.chargeLevel     ?? null;
  const batFin        = lastBatFrame?.battery?.chargeLevel      ?? null;
  const batCapMah     = lastBatFrame?.battery?.fullCapacity      ?? null;  // mAh
  const batTempC      = maxOf(frames, f => f.battery?.temperature);
  const batVoltMin    = minOf(frames, f => f.battery?.voltage);
  const batVoltMax    = maxOf(frames, f => f.battery?.voltage);
  const batCurrent    = maxOf(frames, f => f.battery?.current);

  // Cell voltages mínimas del último frame (indicador de salud)
  const lastCells     = lastBatFrame?.battery?.cellVoltages ?? null;
  const cellVoltMin   = lastCells ? Math.min(...lastCells) : null;
  const cellVoltMax   = lastCells ? Math.max(...lastCells) : null;

  // ── Ciclos de batería (SmartBatteryStatic record) ─────────────
  const batStatic = records.find(r =>
    r.type === 'SmartBatteryGroup' && r.content?.type === 'SmartBatteryStatic'
  )?.content ?? null;

  const ciclos_bateria       = batStatic?.loop_times       ?? null;
  const bateria_vida_pct     = batStatic?.battery_life     ?? null;  // % salud restante
  const bateria_cap_disenio  = batStatic?.designed_capacity ?? null;  // capacidad de diseño

  // ── Vuelo (OSD + Custom) ──────────────────────────────────────
  const altMax      = maxOf(frames, f => f.osd?.height)    ?? 0;
  const velHMax     = maxOf(frames, f => {
    const c = frames.find(fr => fr.custom)?.custom;
    return null; // handled below
  });

  // Custom records tienen hSpeed y distance
  const customRecs  = records.filter(r => r.type === 'Custom');
  const velHMaxMs   = maxOf(customRecs, r => r.content?.hSpeed);       // m/s
  const distancia   = customRecs.length
    ? (customRecs[customRecs.length - 1].content?.distance ?? 0)
    : 0;

  // Duración
  const lastOsd    = [...frames].reverse().find(f => f.osd?.flyTime != null);
  const duracion_s = lastOsd?.osd?.flyTime ?? details.totalTime ?? null;

  // Satélites máximos
  const gpsNumMax  = maxOf(frames, f => f.osd?.gpsNum);

  // Altitud MSL del despegue (en metros)
  const altitudMslM = details.takeOffAltitude
    ? Math.round(details.takeOffAltitude / 10) / 10   // DJI lo da en cm
    : null;

  return {
    serial_aeronave,
    fecha,
    hora_despegue,
    hora_aterrizaje,
    ubicacion,
    condicion_visual: 'VMC',
    tipo_mision:      null,
    notas:            details.aircraftName
                        ? `Aeronave: ${details.aircraftName}`
                        : null,
    incidentes:       'NO',
    _meta: {
      fuente:             'TXT_V13',
      log_version:        parser.version,
      // Aeronave
      modelo_aeronave:    details.productType ?? null,
      nombre_aeronave:    details.aircraftName ?? null,
      serial_aeronave_full,
      // Componentes
      serial_camara,
      serial_rc,
      serial_bateria,
      // Firmware
      firmware_camara:    firmwares['Camera']          ?? null,
      firmware_fc:        firmwares['FlightController'] ?? null,
      firmware_rc:        firmwares['RC']              ?? null,
      firmware_app:       details.appVersion           ?? null,
      // Vuelo
      distancia_max_m:    details.totalDistance > 0 ? details.totalDistance : (distancia > 0 ? distancia : null),
      altitud_max_m:      altMax > 0 ? Math.round(altMax * 10) / 10 : null,
      altitud_msl_m:      altitudMslM,
      vel_horizontal_max: velHMaxMs ? Math.round(velHMaxMs * 10) / 10 : null,
      gps_satelites_max:  gpsNumMax ?? null,
      duracion_s:         duracion_s ? Math.round(duracion_s) : null,
      lat_inicio:         validLat,
      lng_inicio:         validLng,
      // Batería telemetría
      bateria_inicio_pct: batInicio,
      bateria_fin_pct:    batFin,
      bateria_cap_mah:    batCapMah,
      bateria_temp_max_c: batTempC ? Math.round(batTempC * 10) / 10 : null,
      bateria_volt_min_v: batVoltMin ? Math.round(batVoltMin * 1000) / 1000 : null,
      bateria_volt_max_v: batVoltMax ? Math.round(batVoltMax * 1000) / 1000 : null,
      bateria_current_max_a: batCurrent ? Math.round(batCurrent * 100) / 100 : null,
      celda_volt_min_v:   cellVoltMin ? Math.round(cellVoltMin * 1000) / 1000 : null,
      celda_volt_max_v:   cellVoltMax ? Math.round(cellVoltMax * 1000) / 1000 : null,
      // Batería salud (SmartBatteryStatic)
      // loop_times viene en unidades de 1/256 del ciclo real (DJI internal encoding)
      ciclos_bateria:     ciclos_bateria != null ? Math.round(ciclos_bateria / 256) : null,
      bateria_vida_pct,
      bateria_cap_diseno: bateria_cap_disenio,
    },
  };
}

// ── helpers ──────────────────────────────────────────────────

function maxOf(arr, fn) {
  let best = null;
  for (const item of arr) {
    const v = fn(item);
    if (v != null && (best === null || v > best)) best = v;
  }
  return best;
}

function minOf(arr, fn) {
  let best = null;
  for (const item of arr) {
    const v = fn(item);
    if (v != null && (best === null || v < best)) best = v;
  }
  return best;
}

function parseDatetime(raw) {
  if (!raw) return { fecha: null, hora_despegue: null };
  const date = new Date(raw);
  if (isNaN(date.getTime())) return { fecha: null, hora_despegue: null };
  // Colombia = UTC-5 (sin DST)
  const col = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return {
    fecha:        col.toISOString().slice(0, 10),
    hora_despegue: col.toISOString().slice(11, 16),
  };
}

function parseTimeOnly(raw) {
  if (!raw) return null;
  const date = new Date(raw);
  if (isNaN(date.getTime())) return null;
  const col = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return col.toISOString().slice(11, 16);
}
