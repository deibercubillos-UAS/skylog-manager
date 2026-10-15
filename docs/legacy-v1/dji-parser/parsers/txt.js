import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Parses a DJI Fly / GO 4 exported .txt file.
 * These files are CSV with the first line as headers.
 *
 * Returns a raw object ready to be passed to toBitaflyEntry().
 */
export function parseTxt(filePath) {
  const raw = readFileSync(filePath, 'utf-8');

  // DJI TXT files sometimes have a BOM or extra blank lines at the start
  const cleaned = raw.replace(/^﻿/, '').trim();

  const records = parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (!records.length) throw new Error('El archivo TXT no contiene registros de vuelo.');

  const first = records[0];
  const last  = records[records.length - 1];

  // --- fecha y horas ---
  // datetime(utc) campo típico: "2024-03-15 10:23:45"
  const dtField = pickField(first, ['datetime(utc)', 'datetime', 'time(millisecond)']);
  const { fecha, hora_despegue } = parseDatetime(dtField ? first[dtField] : null);
  const hora_aterrizaje = dtField ? parseTimeOnly(last[dtField]) : null;

  // --- serial de aeronave ---
  // No siempre está en el TXT; si no, lo inferimos del nombre de archivo
  const serial = pickField(first, ['drone_sn', 'serial', 'serialNumber', 'aircraft_sn'])
    ? first[pickField(first, ['drone_sn', 'serial', 'serialNumber', 'aircraft_sn'])]
    : inferSerialFromFilename(filePath);

  // --- ubicación: coordenadas del primer registro con GPS válido ---
  const gpsRecord = records.find(r => {
    const lat = parseFloat(r.latitude ?? r.lat ?? 0);
    const lng = parseFloat(r.longitude ?? r.lng ?? 0);
    return lat !== 0 && lng !== 0;
  }) ?? first;

  const lat = parseFloat(gpsRecord.latitude ?? gpsRecord.lat ?? 0);
  const lng = parseFloat(gpsRecord.longitude ?? gpsRecord.lng ?? 0);
  const ubicacion = (lat && lng) ? `${lat.toFixed(6)},${lng.toFixed(6)}` : null;

  // --- duración ---
  const flyTimeField = pickField(last, ['flyTime(s)', 'flytime(s)', 'flighttime(s)', 'time(s)']);
  const duracion_s = flyTimeField ? parseFloat(last[flyTimeField]) : null;

  // --- batería ---
  const batField = pickField(first, ['battery(%)', 'battery_percent', 'batteryPercent']);
  const batEndField = pickField(last, ['battery(%)', 'battery_percent', 'batteryPercent']);

  // --- altitud máxima ---
  const altField = pickField(first, ['altitude(feet)', 'height(feet)', 'height(m)']);
  const altMax = altField
    ? Math.max(...records.map(r => parseFloat(r[altField] ?? 0)))
    : null;

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
      fuente:             'TXT',
      modelo_aeronave:    pickValue(first, ['drone_type', 'droneType', 'aircraft_type']) ?? null,
      firmware:           pickValue(first, ['firmware_version', 'firmwareVersion'])      ?? null,
      distancia_max_m:    null,
      altitud_max_m:      altMax ? feetToMeters(altMax) : null,
      bateria_inicio_pct: batField    ? parseFloat(first[batField])   : null,
      bateria_fin_pct:    batEndField ? parseFloat(last[batEndField]) : null,
      duracion_s,
      lat_inicio: lat || null,
      lng_inicio: lng || null,
    },
  };
}

// ---------- helpers ----------

function pickField(record, candidates) {
  const keys = Object.keys(record).map(k => k.trim());
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase() === c.toLowerCase());
    if (found) return found;
  }
  return null;
}

function pickValue(record, candidates) {
  const field = pickField(record, candidates);
  return field ? record[field] : null;
}

function parseDatetime(raw) {
  if (!raw) return { fecha: null, hora_despegue: null };
  // "2024-03-15 10:23:45" or "2024-03-15T10:23:45Z"
  const m = String(raw).match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) return { fecha: m[1], hora_despegue: m[2] };
  return { fecha: null, hora_despegue: null };
}

function parseTimeOnly(raw) {
  if (!raw) return null;
  const m = String(raw).match(/[T ](\d{2}:\d{2})/);
  return m ? m[1] : null;
}

function inferSerialFromFilename(filePath) {
  // e.g. "FLY_20240315_SN1234ABC.txt" → "SN1234ABC"
  const base = path.basename(filePath, path.extname(filePath));
  const m = base.match(/[_-]([A-Z0-9]{8,})/i);
  return m ? m[1].toUpperCase() : `UNKNOWN_${base}`;
}

function feetToMeters(feet) {
  return Math.round(feet * 0.3048 * 10) / 10;
}
