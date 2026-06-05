/**
 * DJI TXT flight log parser — server-side, accepts a Buffer directly.
 * Adapted from dji-parser/parsers/txt-encrypted.js
 *
 * Requires: DJI_API_KEY in environment variables.
 */

const DJI_API_KEY = process.env.DJI_API_KEY ?? null;

export async function parseDjiTxtBuffer(buf) {
  if (!DJI_API_KEY) {
    throw new Error(
      'La importación DJI no está disponible en este momento. Contacta al soporte: soporte@bitafly.com'
    );
  }

  // Dynamic import to avoid webpack bundling the WASM module
  const { DJILog } = await import('dji-log-parser-js');
  const parser = new DJILog(buf);

  if (parser.version === 0) {
    throw new Error('El archivo no es un log DJI válido o el formato no está soportado.');
  }

  let details = {};
  try { details = parser.details ?? {}; } catch { /* ignorar */ }

  const keychains = await parser.fetchKeychains(DJI_API_KEY);
  const frames    = parser.frames(keychains)  ?? [];
  const records   = parser.records(keychains) ?? [];

  // ── Tiempo ──────────────────────────────────────────────────────
  const { fecha, hora_despegue } = parseDatetime(details.startTime);

  const lastFrameWithTime = [...frames].reverse().find(f =>
    f.custom?.dateTime && !f.custom.dateTime.startsWith('1970')
  );
  const hora_aterrizaje = lastFrameWithTime
    ? parseTimeOnly(lastFrameWithTime.custom.dateTime)
    : null;

  // ── GPS ─────────────────────────────────────────────────────────
  const gpsFrame = frames.find(f =>
    f.osd?.latitude  && Math.abs(f.osd.latitude)  <= 90  && f.osd.latitude  !== 0 &&
    f.osd?.longitude && Math.abs(f.osd.longitude) <= 180 && f.osd.longitude !== 0
  );
  const validLat  = gpsFrame?.osd?.latitude  ?? null;
  const validLng  = gpsFrame?.osd?.longitude ?? null;
  const ubicacion = (validLat && validLng)
    ? `${validLat.toFixed(6)},${validLng.toFixed(6)}`
    : null;

  // ── Seriales ────────────────────────────────────────────────────
  const recoverRec       = records.find(r => r.type === 'Recover')?.content ?? {};
  const serial_aeronave  = details.aircraftSn ?? recoverRec.aircraftSn ?? null;
  const serial_camara    = details.cameraSn   ?? recoverRec.cameraSn   ?? null;
  const serial_rc        = details.rcSn       ?? recoverRec.rcSn       ?? null;
  const serial_bateria   = details.batterySn  ?? recoverRec.batterySn  ?? null;

  const compRec = records.find(r =>
    r.type === 'ComponentSerial' && r.content?.componentType === 'Aircraft'
  );
  const serial_aeronave_full = compRec?.content?.serial ?? serial_aeronave;

  // ── Firmware ────────────────────────────────────────────────────
  const firmwares = {};
  for (const r of records.filter(r => r.type === 'Firmware')) {
    const sender = r.content?.senderType ?? 'Unknown';
    firmwares[sender] = r.content?.version ?? null;
  }

  // ── Batería ─────────────────────────────────────────────────────
  const firstBatFrame = frames.find(f => f.battery?.chargeLevel != null);
  const lastBatFrame  = [...frames].reverse().find(f => f.battery?.chargeLevel != null);
  const batInicio     = firstBatFrame?.battery?.chargeLevel  ?? null;
  const batFin        = lastBatFrame?.battery?.chargeLevel   ?? null;
  const batCapMah     = lastBatFrame?.battery?.fullCapacity   ?? null;
  const batTempC      = maxOf(frames, f => f.battery?.temperature);
  const batVoltMin    = minOf(frames, f => f.battery?.voltage);
  const batVoltMax    = maxOf(frames, f => f.battery?.voltage);
  const batCurrent    = maxOf(frames, f => f.battery?.current);
  const lastCells     = lastBatFrame?.battery?.cellVoltages  ?? null;
  const cellVoltMin   = lastCells ? Math.min(...lastCells) : null;
  const cellVoltMax   = lastCells ? Math.max(...lastCells) : null;

  const batStatic = records.find(r =>
    r.type === 'SmartBatteryGroup' && r.content?.type === 'SmartBatteryStatic'
  )?.content ?? null;

  const ciclos_bateria     = batStatic?.loop_times        ?? null;
  const bateria_vida_pct   = batStatic?.battery_life      ?? null;
  const bateria_cap_diseno = batStatic?.designed_capacity ?? null;

  // ── Vuelo ────────────────────────────────────────────────────────
  const altMax     = maxOf(frames, f => f.osd?.height) ?? 0;
  const customRecs = records.filter(r => r.type === 'Custom');
  const velHMaxMs  = maxOf(customRecs, r => r.content?.hSpeed);
  const distancia  = customRecs.length
    ? (customRecs[customRecs.length - 1].content?.distance ?? 0)
    : 0;

  const lastOsd    = [...frames].reverse().find(f => f.osd?.flyTime != null);
  const duracion_s = lastOsd?.osd?.flyTime ?? details.totalTime ?? null;
  const gpsNumMax  = maxOf(frames, f => f.osd?.gpsNum);
  const altitudMslM = details.takeOffAltitude
    ? Math.round(details.takeOffAltitude / 10) / 10
    : null;

  return {
    serial_aeronave,
    fecha,
    hora_despegue,
    hora_aterrizaje,
    ubicacion,
    condicion_visual: 'VMC',
    tipo_mision:      null,
    notas:            details.aircraftName ? `Aeronave: ${details.aircraftName}` : null,
    incidentes:       'NO',
    // Raw frames — disponibles para el servidor (detección de alertas, replay).
    // No se almacenan en BD; solo se usan durante el procesamiento del import.
    _frames: frames,
    _meta: {
      fuente:               'TXT_V13',
      log_version:          parser.version,
      modelo_aeronave:      formatProductType(details.productType),
      nombre_aeronave:      details.aircraftName ?? null,
      serial_aeronave_full,
      serial_camara,
      serial_rc,
      serial_bateria,
      firmware_camara:      firmwares['Camera']            ?? null,
      firmware_fc:          firmwares['FlightController']  ?? null,
      firmware_rc:          firmwares['RC']                ?? null,
      firmware_app:         details.appVersion             ?? null,
      distancia_max_m:      details.totalDistance > 0
                              ? details.totalDistance
                              : (distancia > 0 ? distancia : null),
      altitud_max_m:        altMax > 0 ? Math.round(altMax * 10) / 10 : null,
      altitud_msl_m:        altitudMslM,
      vel_horizontal_max:   velHMaxMs ? Math.round(velHMaxMs * 10) / 10 : null,
      gps_satelites_max:    gpsNumMax  ?? null,
      duracion_s:           duracion_s ? Math.round(duracion_s) : null,
      lat_inicio:           validLat,
      lng_inicio:           validLng,
      bateria_inicio_pct:   batInicio,
      bateria_fin_pct:      batFin,
      bateria_cap_mah:      batCapMah,
      bateria_temp_max_c:   batTempC    ? Math.round(batTempC    * 10)   / 10   : null,
      bateria_volt_min_v:   batVoltMin  ? Math.round(batVoltMin  * 1000) / 1000 : null,
      bateria_volt_max_v:   batVoltMax  ? Math.round(batVoltMax  * 1000) / 1000 : null,
      bateria_current_max_a: batCurrent ? Math.round(batCurrent  * 100)  / 100  : null,
      celda_volt_min_v:     cellVoltMin ? Math.round(cellVoltMin * 1000) / 1000 : null,
      celda_volt_max_v:     cellVoltMax ? Math.round(cellVoltMax * 1000) / 1000 : null,
      ciclos_bateria:       ciclos_bateria != null ? Math.round(ciclos_bateria / 256) : null,
      bateria_vida_pct,
      bateria_cap_diseno,
    },
  };
}

// ── Product type formatter ───────────────────────────────────────
// La librería devuelve strings como "Mini3Pro", "MavicAir2S", etc.
// Para modelos desconocidos devuelve { Unknown: N } — lo ignoramos.
const PRODUCT_TYPE_OVERRIDES = {
  Phantom34K:          'Phantom 3 4K',
  Phantom4ProV2:       'Phantom 4 Pro V2',
  Phantom4RTK:         'Phantom 4 RTK',
  Phantom4Multispectral: 'Phantom 4 Multispectral',
  Matrice200V2:        'Matrice 200 V2',
  Matrice210V2:        'Matrice 210 V2',
  Matrice210RTKV2:     'Matrice 210 RTK V2',
  Matrice300RTK:       'Matrice 300 RTK',
  Matrice350RTK:       'Matrice 350 RTK',
  Matrice30:           'Matrice 30',
  MavicAir2S:          'Mavic Air 2S',
  Mini2SE:             'Mini 2 SE',
  Mini3Pro:            'Mini 3 Pro',
  Mini4Pro:            'Mini 4 Pro',
  Mavic2:              'Mavic 2',
  Mavic2Enterprise:    'Mavic 2 Enterprise',
  Mavic3Pro:           'Mavic 3 Pro',
  Mavic3Enterprise:    'Mavic 3 Enterprise',
  MavicAir2:           'Mavic Air 2',
  MavicAir:            'Mavic Air',
  MavicPro:            'Mavic Pro',
  MavicMini:           'Mavic Mini',
  Mavic3:              'Mavic 3',
  Mavic3Classic:       'Mavic 3 Classic',
  Mini3:               'Mini 3',
  Mini2:               'Mini 2',
  MiniSE:              'Mini SE',
  Inspire1:            'Inspire 1',
  Inspire2:            'Inspire 2',
  Phantom3Standard:    'Phantom 3 Standard',
  Phantom3Advanced:    'Phantom 3 Advanced',
  Phantom3Pro:         'Phantom 3 Professional',
  Phantom3SE:          'Phantom 3 SE',
  Phantom4:            'Phantom 4',
  Phantom4Pro:         'Phantom 4 Pro',
  Phantom4Advanced:    'Phantom 4 Advanced',
  OSMOPlus:            'OSMO+',
  OSMOMobile:          'OSMO Mobile',
  OSMORaw:             'OSMO Raw',
  OSMOPro:             'OSMO Pro',
  OSMO:                'OSMO',
  N3FC:                'N3 FC',
  AG405:               'AG 405',
  Spark:               'Spark',
  Avata:               'Avata',
  Avata2:              'Avata 2',
  FPV:                 'FPV',
  None:                null,
};

function formatProductType(pt) {
  if (pt == null) return null;
  // Número directo (versiones antiguas de la librería)
  if (typeof pt === 'number') return null;
  // { Unknown: N } → modelo no reconocido por la librería
  if (typeof pt === 'object') return null;
  // String conocido con override específico
  if (Object.prototype.hasOwnProperty.call(PRODUCT_TYPE_OVERRIDES, pt)) {
    return PRODUCT_TYPE_OVERRIDES[pt];
  }
  // String desconocido: separar camelCase genéricamente
  const formatted = pt
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .trim();
  return formatted || null;
}

// ── Helpers ──────────────────────────────────────────────────────

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
    fecha:         col.toISOString().slice(0, 10),
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
