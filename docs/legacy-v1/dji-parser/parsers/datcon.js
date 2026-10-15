/**
 * DatCon subprocess wrapper.
 *
 * Calls DatCon.jar via Java to convert a .DAT file to CSV,
 * then parses the CSV to build a Bitafly-compatible logbook entry.
 *
 * Requirements:
 *   - Java installed (already confirmed)
 *   - DatCon.jar placed in  dji-parser/tools/DatCon.jar
 *     Get it from: https://github.com/msackman/DatCon/releases
 *
 * DatCon CLI usage:
 *   java -jar DatCon.jar -f <input.dat> -csv <output.csv>
 */

import { execFileSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dir  = path.dirname(fileURLToPath(import.meta.url));
const DATCON = path.join(__dir, '..', 'tools', 'DatCon.jar');

export function isDatConAvailable() {
  return existsSync(DATCON);
}

/**
 * Run DatCon on a .DAT file and return a raw parsed object.
 * @param {string} datPath - Absolute path to the .DAT file
 * @returns raw object ready for toBitaflyEntry()
 */
export function parseDatWithDatCon(datPath) {
  if (!isDatConAvailable()) {
    throw new Error(
      `DatCon.jar no encontrado en ${DATCON}\n` +
      `Descárgalo desde: https://github.com/msackman/DatCon/releases\n` +
      `Colócalo como: dji-parser/tools/DatCon.jar`
    );
  }

  // Output CSV next to the input file, in the output/ folder
  const outDir = path.join(__dir, '..', 'output');
  mkdirSync(outDir, { recursive: true });
  const baseName = path.basename(datPath, path.extname(datPath));
  const csvPath  = path.join(outDir, `${baseName}_datcon.csv`);

  // Run DatCon
  try {
    execFileSync('java', ['-jar', DATCON, '-f', datPath, '-csv', csvPath], {
      timeout: 60_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const stderr = err.stderr?.toString() ?? '';
    const stdout = err.stdout?.toString() ?? '';
    const msg    = stderr || stdout || err.message;
    throw new Error(`DatCon falló: ${msg.slice(0, 400)}`);
  }

  if (!existsSync(csvPath)) {
    throw new Error(`DatCon no generó CSV en ${csvPath}. El modelo podría no estar soportado.`);
  }

  return parseDatConCsv(csvPath, datPath);
}

/**
 * Parse the CSV that DatCon generates into a raw Bitafly object.
 */
function parseDatConCsv(csvPath, originalDatPath) {
  const raw  = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '').trim();
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });

  if (!rows.length) throw new Error('DatCon generó un CSV vacío.');

  const first = rows[0];
  const last  = rows[rows.length - 1];

  // ── Timestamp ──────────────────────────────────────────────
  // DatCon fields: 'time(millisecond)', 'datetime(utc)', 'CUSTOM.date [s]'
  const dtField = pickField(first, ['datetime(utc)', 'datetime', 'CUSTOM.date [s]']);
  const { fecha, hora_despegue } = dtField ? parseDatetime(first[dtField]) : { fecha: null, hora_despegue: null };
  const hora_aterrizaje = dtField ? parseTimeOnly(last[dtField]) : null;

  // ── Serial ─────────────────────────────────────────────────
  // DatCon fields: 'DETAILS.aircraft_serial', 'aircraft SN', 'AIRCRAFT.sn'
  const snField  = pickField(first, ['DETAILS.aircraft_serial', 'aircraft SN', 'AIRCRAFT.sn', 'drone_sn']);
  const serial   = snField ? first[snField] : null;

  // ── GPS ────────────────────────────────────────────────────
  // DatCon fields: 'GPS(0):Long', 'GPS(0):Lat', 'GPS:Long', 'GPS:Lat', 'longitude', 'latitude'
  const gpsRow   = rows.find(r => {
    const lat = parseFloat(r['GPS(0):Lat'] ?? r['GPS:Lat'] ?? r['latitude'] ?? 0);
    const lng = parseFloat(r['GPS(0):Long'] ?? r['GPS:Long'] ?? r['longitude'] ?? 0);
    return lat !== 0 && lng !== 0;
  }) ?? first;

  const lat      = parseFloat(pickValue(gpsRow, ['GPS(0):Lat', 'GPS:Lat', 'latitude']) ?? 0);
  const lng      = parseFloat(pickValue(gpsRow, ['GPS(0):Long', 'GPS:Long', 'longitude']) ?? 0);
  const ubicacion = (lat && lng) ? `${lat.toFixed(6)},${lng.toFixed(6)}` : null;

  // ── Altitude & battery ─────────────────────────────────────
  const altField  = pickField(first, ['GPS(0):heightMSL', 'altitude(feet)', 'height(feet)', 'height(m)']);
  const altValues = altField ? rows.map(r => parseFloat(r[altField] ?? 0)) : [];
  const altMax    = altValues.length ? Math.max(...altValues) : null;

  const batField  = pickField(first, ['SMART_BATT.chargeLevel', 'battery(%)', 'chargeLevel']);
  const batInicio = batField ? parseFloat(first[batField]) : null;
  const batFin    = batField ? parseFloat(last[batField])  : null;

  // ── Duration ───────────────────────────────────────────────
  const flyField  = pickField(last, ['flyTime(s)', 'time(millisecond)', 'CUSTOM.flyTime [s]']);
  let duracion_s  = null;
  if (flyField) {
    const v = parseFloat(last[flyField]);
    duracion_s = flyField.includes('millisecond') ? v / 1000 : v;
  }

  // ── Model ──────────────────────────────────────────────────
  const modelField = pickField(first, ['DETAILS.aircraft_type', 'aircraft type', 'aircraftType']);
  const modelo     = modelField ? first[modelField] : null;

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
      modelo_aeronave:    modelo,
      firmware:           null,
      distancia_max_m:    null,
      altitud_max_m:      altMax ? Math.round(altMax * 10) / 10 : null,
      bateria_inicio_pct: batInicio,
      bateria_fin_pct:    batFin,
      duracion_s,
      lat_inicio: lat || null,
      lng_inicio: lng || null,
      _datcon: {
        csvPath,
        totalRows:   rows.length,
        columns:     Object.keys(first).slice(0, 20),
      },
    },
  };
}

// ── helpers ──────────────────────────────────────────────────

function pickField(record, candidates) {
  const keys = Object.keys(record);
  for (const c of candidates) {
    const found = keys.find(k => k.toLowerCase() === c.toLowerCase());
    if (found) return found;
  }
  return null;
}

function pickValue(record, candidates) {
  const f = pickField(record, candidates);
  return f ? record[f] : null;
}

function parseDatetime(raw) {
  if (!raw) return { fecha: null, hora_despegue: null };
  const m = String(raw).match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (m) return { fecha: m[1], hora_despegue: m[2] };
  return { fecha: null, hora_despegue: null };
}

function parseTimeOnly(raw) {
  if (!raw) return null;
  const m = String(raw).match(/[T ](\d{2}:\d{2})/);
  return m ? m[1] : null;
}
