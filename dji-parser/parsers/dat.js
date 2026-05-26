import { readFileSync } from 'fs';

export function parseDat(filePath) {
  const buf = readFileSync(filePath);

  if (buf.length < 16) throw new Error('Archivo DAT demasiado pequeño — no es un log DJI válido.');

  // ── Detect encrypted perception / ROS bag format ──────────
  const bagEncResult = detectBagEnc(buf, filePath);
  if (bagEncResult) return bagEncResult;

  const magic      = buf.slice(0, 4).toString('hex');
  const headerHex  = buf.slice(0, 64).toString('hex').match(/.{1,2}/g).join(' ');

  // Try to find the actual header size by scanning for the first valid record burst
  const headerSize = detectHeaderSize(buf);

  const records    = extractRecords(buf, headerSize);
  const typeHist   = buildTypeHistogram(records);

  // Detect which type code holds OSD data in THIS file
  const osdType    = detectOsdType(records, typeHist);
  const batType    = detectBatType(records, typeHist);

  const osd     = records.filter(r => r.type === osdType);
  const battery = records.filter(r => r.type === batType);

  if (!osd.length) {
    return buildFallbackResult(filePath, buf, magic, headerHex, records.length, typeHist);
  }

  const serial     = extractSerial(buf);
  const withGps    = osd.filter(r => r.lat && r.lat !== 0 && r.lng && r.lng !== 0);
  const firstGps   = withGps[0]    ?? osd[0];
  const lastOsd    = osd[osd.length - 1];

  const tsStart    = firstGps?.timestampMs ?? extractHeaderTimestamp(buf);
  const tsEnd      = lastOsd?.timestampMs  ?? null;

  const { fecha, hora_despegue, hora_aterrizaje } = buildTimes(tsStart, tsEnd);

  const lat        = firstGps?.lat ?? null;
  const lng        = firstGps?.lng ?? null;
  const ubicacion  = (lat && lng) ? `${lat.toFixed(6)},${lng.toFixed(6)}` : null;

  const altMax     = osd.length ? Math.max(...osd.map(r => r.altitude ?? 0)) : null;
  const batInicio  = battery[0]?.percent             ?? osd[0]?.batteryPct     ?? null;
  const batFin     = battery[battery.length-1]?.percent ?? lastOsd?.batteryPct ?? null;
  const duracion_s = (tsStart && tsEnd) ? Math.round((tsEnd - tsStart) / 1000) : null;

  return {
    serial_aeronave:  serial,
    fecha,
    hora_despegue,
    hora_aterrizaje,
    ubicacion,
    condicion_visual: 'VMC',
    tipo_mision:      null,
    notas:            null,
    incidentes:       'NO',
    _meta: {
      fuente:             'DAT',
      modelo_aeronave:    extractModel(buf),
      firmware:           extractFirmware(buf),
      distancia_max_m:    null,
      altitud_max_m:      altMax ? Math.round(altMax * 10) / 10 : null,
      bateria_inicio_pct: batInicio,
      bateria_fin_pct:    batFin,
      duracion_s,
      lat_inicio: lat,
      lng_inicio: lng,
      _diag: {
        magic,
        headerHex,
        headerSize,
        isKnownMagic: isKnownMagic(magic),
        totalRecords: records.length,
        osdType:      `0x${osdType.toString(16).padStart(2,'0')}`,
        osdRecords:   osd.length,
        batType:      `0x${batType.toString(16).padStart(2,'0')}`,
        fileBytes:    buf.length,
        typeHistogram: typeHist,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Format detection
// ─────────────────────────────────────────────────────────────

/**
 * Detect encrypted ROS bag perception files (.bag.enc) used by the
 * Mini 4 Pro obstacle-avoidance module. These contain no flight telemetry.
 * Returns a clean null-result if detected, or null to continue normal parsing.
 */
function detectBagEnc(buf, filePath) {
  const header = buf.slice(0, 512).toString('latin1');

  const isBagEnc =
    header.includes('.bag.enc') ||
    header.includes('/rosbag') ||
    (buf[0] === 0x23 && buf[1] === 0x52 && buf[2] === 0x4f && buf[3] === 0x53); // #ROS

  if (!isBagEnc) return null;

  // Try to extract the file ID / serial embedded in the unencrypted header
  const serialMatch = header.match(/[A-Z0-9]{10,20}/);
  const fileId = serialMatch ? serialMatch[0] : null;

  const magic = buf.slice(0, 4).toString('hex');

  return {
    serial_aeronave:  null,
    fecha:            null,
    hora_despegue:    null,
    hora_aterrizaje:  null,
    ubicacion:        null,
    condicion_visual: 'VMC',
    tipo_mision:      null,
    notas:            'Archivo de módulo de percepción — no contiene datos de vuelo.',
    incidentes:       'NO',
    _meta: {
      fuente: 'DAT',
      _diag: {
        magic,
        format:    'ROS_BAG_ENC',
        fileBytes: buf.length,
        fileId,
        message:   'Archivo de módulo de percepción (ROS bag cifrado). No contiene GPS, altitud ni telemetría de vuelo. Usa el archivo .TXT del mismo vuelo.',
      },
    },
  };
}

function isKnownMagic(magic) {
  return magic.startsWith('55aa') || magic.startsWith('0055') || magic.startsWith('55');
}

/**
 * Scan several candidate header sizes and pick the one that produces
 * the most consistent records (highest count with sane lengths).
 */
function detectHeaderSize(buf) {
  const candidates = [0, 64, 128, 192, 256];
  let best = 128;
  let bestCount = 0;

  for (const start of candidates) {
    const count = countRecords(buf, start);
    if (count > bestCount) {
      bestCount = count;
      best = start;
    }
  }
  return best;
}

function countRecords(buf, startOffset) {
  let offset = startOffset;
  let count  = 0;
  while (offset + 4 < buf.length) {
    const len = buf.readUInt16LE(offset);
    if (len < 4 || len > 512 || offset + len > buf.length) { offset++; continue; }
    count++;
    offset += len;
  }
  return count;
}

function buildTypeHistogram(records) {
  const hist = {};
  for (const r of records) {
    const key = `0x${r.type.toString(16).padStart(2,'0')}`;
    hist[key] = (hist[key] ?? 0) + 1;
  }
  // Sort by count descending
  return Object.fromEntries(
    Object.entries(hist).sort((a, b) => b[1] - a[1])
  );
}

/**
 * The OSD record is always the most frequent type that has payloads >= 14 bytes
 * (enough to hold timestamp + lat + lng + alt).
 */
function detectOsdType(records, typeHist) {
  // First try known common OSD types
  const knownOsd = [0x00, 0x01, 0x06, 0x07, 0x09, 0x0c, 0x10, 0x30];
  for (const t of knownOsd) {
    const key = `0x${t.toString(16).padStart(2,'0')}`;
    if (typeHist[key] && typeHist[key] > 10) return t;
  }

  // Fallback: pick the most frequent type whose payloads are >= 14 bytes
  const sorted = Object.entries(typeHist).sort((a, b) => b[1] - a[1]);
  for (const [hexType] of sorted) {
    const t = parseInt(hexType, 16);
    const sample = records.find(r => r.type === t);
    if (sample?.payload?.length >= 14) return t;
  }

  return 0x00;
}

function detectBatType(records, typeHist) {
  const knownBat = [0x28, 0x02, 0x03, 0x0b, 0x11, 0x35];
  for (const t of knownBat) {
    const key = `0x${t.toString(16).padStart(2,'0')}`;
    if (typeHist[key]) return t;
  }
  return 0x28;
}

// ─────────────────────────────────────────────────────────────
// Record extraction
// ─────────────────────────────────────────────────────────────

function extractRecords(buf, startOffset = 128) {
  const records = [];
  let offset = startOffset;

  while (offset + 4 < buf.length) {
    const len  = buf.readUInt16LE(offset);
    const type = buf[offset + 2];

    if (len < 4 || len > 512 || offset + len > buf.length) {
      offset++;
      continue;
    }

    const payload = buf.slice(offset + 3, offset + 3 + len - 3);
    const record  = { type, payload, offset };

    try { decodePayload(record); } catch (_) { /* non-fatal */ }

    records.push(record);
    offset += len;
  }

  return records;
}

function decodePayload(record) {
  const p = record.payload;
  if (p.length < 8) return;

  // OSD-style record: try multiple timestamp/GPS layouts
  if (p.length >= 18) {
    // Layout A: [ts_s: 4B LE] [ts_ms: 2B LE] [lat: 4B LE /1e7] [lng: 4B LE /1e7] [alt: 2B LE /10]
    const tsA   = p.readUInt32LE(0) * 1000 + p.readUInt16LE(4);
    const latA  = p.readInt32LE(6)  / 1e7;
    const lngA  = p.readInt32LE(10) / 1e7;
    const altA  = p.readInt16LE(14) / 10;

    // Sanity: valid epoch range (2018-2030) and plausible lat/lng
    if (tsA > 1514764800000 && tsA < 1893456000000 &&
        Math.abs(latA) <= 90 && Math.abs(lngA) <= 180) {
      record.timestampMs = tsA;
      record.lat         = latA;
      record.lng         = lngA;
      record.altitude    = altA;
      record.batteryPct  = p.length >= 20 ? p[18] : null;
      return;
    }

    // Layout B: [ts_ms: 8B LE double] [lat: 8B LE double] [lng: 8B LE double]
    if (p.length >= 24) {
      const tsB  = Number(p.readBigUInt64LE(0));
      const latB = p.readDoubleBE(8);
      const lngB = p.readDoubleBE(16);
      if (tsB > 1514764800000 && tsB < 1893456000000 &&
          Math.abs(latB) <= 90 && Math.abs(lngB) <= 180) {
        record.timestampMs = tsB;
        record.lat         = latB;
        record.lng         = lngB;
        record.altitude    = p.length >= 26 ? p.readInt16LE(24) / 10 : null;
        return;
      }
    }

    // Layout C: lat/lng as doubles at offset 0 (some Mavic formats)
    if (p.length >= 16) {
      const latC = p.readDoubleBE(0);
      const lngC = p.readDoubleBE(8);
      if (Math.abs(latC) <= 90 && Math.abs(lngC) <= 180 && latC !== 0) {
        record.lat = latC;
        record.lng = lngC;
      }
    }
  }

  // Battery record
  if (p.length >= 1) {
    record.percent  = p[0] <= 100 ? p[0] : null;
    record.voltageV = p.length >= 4 ? p.readUInt16LE(2) / 1000 : null;
  }
}

// ─────────────────────────────────────────────────────────────
// Header field extraction
// ─────────────────────────────────────────────────────────────

function extractSerial(buf) {
  // DJI serial pattern: 10-20 uppercase alphanumeric chars, not all same letter
  const header = buf.slice(0, 512);
  for (let i = 0; i < header.length - 20; i++) {
    let len = 0;
    while (i + len < header.length && isAlphaNum(header[i + len])) len++;
    if (len >= 10 && len <= 20) {
      const candidate = header.slice(i, i + len).toString('ascii');
      // Reject strings that are all the same character (e.g. "UUUUUUU")
      if (new Set(candidate).size > 3) return candidate;
    }
  }
  return null;
}

function isAlphaNum(byte) {
  return (byte >= 0x30 && byte <= 0x39) ||   // 0-9
         (byte >= 0x41 && byte <= 0x5A) ||   // A-Z
         (byte >= 0x61 && byte <= 0x7A);     // a-z
}

function extractModel(buf) {
  const header = buf.slice(0, 256).toString('latin1').replace(/[^\x20-\x7E]/g, ' ');
  const m = header.match(/\b(Mini\s*[23]?\s*(Pro)?|Mavic\s*[23]?\s*(Pro|Air)?|Phantom\s*[1-4]?|Air\s*[23]?|FPV|Agras)\b/i);
  return m ? m[0].replace(/\s+/g, ' ').trim() : null;
}

function extractFirmware(buf) {
  const header = buf.slice(0, 512).toString('latin1').replace(/[^\x20-\x7E]/g, ' ');
  const m = header.match(/\b(\d{2}\.\d{2}\.\d{2,4}(?:\.\d{2,4})?)\b/);
  return m ? m[1] : null;
}

function extractHeaderTimestamp(buf) {
  for (const off of [4, 8, 12, 16]) {
    if (off + 4 > buf.length) continue;
    const ts = buf.readUInt32LE(off);
    if (ts > 1514764800 && ts < 1893456000) return ts * 1000;
  }
  return null;
}

function buildTimes(tsStartMs, tsEndMs) {
  if (!tsStartMs) return { fecha: null, hora_despegue: null, hora_aterrizaje: null };
  const start = new Date(tsStartMs);
  const fecha           = start.toISOString().slice(0, 10);
  const hora_despegue   = start.toISOString().slice(11, 16);
  const hora_aterrizaje = tsEndMs ? new Date(tsEndMs).toISOString().slice(11, 16) : null;
  return { fecha, hora_despegue, hora_aterrizaje };
}

function buildFallbackResult(filePath, buf, magic, headerHex, totalRecords, typeHist) {
  return {
    serial_aeronave:  null,
    fecha:            null,
    hora_despegue:    null,
    hora_aterrizaje:  null,
    ubicacion:        null,
    condicion_visual: 'VMC',
    tipo_mision:      null,
    notas:            'Parser DAT: no se decodificaron registros OSD.',
    incidentes:       'NO',
    _meta: {
      fuente: 'DAT',
      _diag: {
        magic,
        headerHex,
        totalRecords,
        fileBytes: buf.length,
        typeHistogram: typeHist,
        message: 'Formato no reconocido — revisa el typeHistogram para ajustar el parser.',
      },
    },
  };
}
