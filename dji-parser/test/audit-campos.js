/**
 * Auditoría completa de campos extraíbles de un TXT DJI.
 * Muestra TODO lo que la librería expone: details, frames y raw records.
 *
 * Run: node test/audit-campos.js samples/FlightRecord_xxx.txt
 */

import 'dotenv/config';
import { DJILog } from 'dji-log-parser-js';
import { readFileSync } from 'fs';
import path from 'path';

const filePath = path.resolve(process.argv[2]);
const buf      = readFileSync(filePath);
const parser   = new DJILog(buf);

const API_KEY = process.env.DJI_API_KEY;
if (!API_KEY) { console.error('Necesitas DJI_API_KEY en .env'); process.exit(1); }

const keychains = await parser.fetchKeychains(API_KEY);
const frames    = parser.frames(keychains)  ?? [];
const records   = parser.records(keychains) ?? [];

// ═══ 1. DETAILS ══════════════════════════════════════════════
console.log('\n═══ 1. DETAILS (metadatos del vuelo) ═══');
console.log(JSON.stringify(parser.details, null, 2));

// ═══ 2. RESUMEN DE FRAMES ════════════════════════════════════
console.log(`\n═══ 2. FRAMES — ${frames.length} total ═══`);

// Muestra todas las claves únicas presentes en los frames
const frameKeys = new Set();
for (const f of frames) {
  for (const section of Object.keys(f)) {
    for (const key of Object.keys(f[section] ?? {})) {
      frameKeys.add(`${section}.${key}`);
    }
  }
}
console.log('Campos disponibles en frames:');
for (const k of [...frameKeys].sort()) console.log(`  ${k}`);

// ═══ 3. BATERÍA — todos los valores distintos ════════════════
console.log('\n═══ 3. BATERÍA (todos los campos por frame) ═══');
const batFields = new Set();
for (const f of frames) {
  for (const k of Object.keys(f.battery ?? {})) batFields.add(k);
}
console.log('Campos de batería:', [...batFields].join(', '));

// Muestra el primer y último frame de batería completos
const firstBat = frames.find(f => f.battery != null)?.battery;
const lastBat  = [...frames].reverse().find(f => f.battery != null)?.battery;
console.log('\nPrimer frame batería:');
console.log(JSON.stringify(firstBat, null, 2));
console.log('\nÚltimo frame batería:');
console.log(JSON.stringify(lastBat, null, 2));

// Min y max de cada campo numérico de batería
const batStats = {};
for (const f of frames) {
  for (const [k, v] of Object.entries(f.battery ?? {})) {
    if (typeof v !== 'number') continue;
    if (!batStats[k]) batStats[k] = { min: v, max: v };
    batStats[k].min = Math.min(batStats[k].min, v);
    batStats[k].max = Math.max(batStats[k].max, v);
  }
}
console.log('\nRango de cada campo numérico de batería (min → max):');
for (const [k, { min, max }] of Object.entries(batStats)) {
  console.log(`  ${k}: ${min} → ${max}`);
}

// ═══ 4. RAW RECORDS — tipos disponibles ══════════════════════
console.log(`\n═══ 4. RAW RECORDS — ${records.length} total ═══`);

const recTypeHist = {};
for (const r of records) {
  const t = r.type ?? r.messageType ?? JSON.stringify(Object.keys(r))[0];
  recTypeHist[t] = (recTypeHist[t] ?? 0) + 1;
}
console.log('Tipos de record (frecuencia):');
for (const [t, c] of Object.entries(recTypeHist).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${t}: ${c}`);
}

// Muestra el primer record de cada tipo
console.log('\nPrimer record de cada tipo:');
const seen = new Set();
for (const r of records) {
  const t = r.type ?? r.messageType ?? 'unknown';
  if (seen.has(t)) continue;
  seen.add(t);
  console.log(`\n  [${t}]:`);
  console.log('  ' + JSON.stringify(r, null, 2).split('\n').join('\n  '));
}

// ═══ 5. BUSCAR CICLOS DE BATERÍA ═════════════════════════════
console.log('\n═══ 5. BÚSQUEDA DE CICLOS DE BATERÍA ═══');
const cycleHits = [];
function searchCycles(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${k}` : k;
    if (/cycle|count|charge/i.test(k) && typeof v === 'number') {
      cycleHits.push({ path: fullPath, value: v });
    }
    if (typeof v === 'object') searchCycles(v, fullPath);
  }
}

searchCycles(parser.details, 'details');
for (const [i, r] of records.entries()) {
  searchCycles(r, `records[${i}]`);
}

if (cycleHits.length) {
  for (const h of cycleHits) console.log(`  ${h.path}: ${h.value}`);
} else {
  console.log('  No se encontró campo de ciclos de batería en details ni records.');
}

// ═══ 6. TODOS LOS SERIALES ═══════════════════════════════════
console.log('\n═══ 6. SERIALES DISPONIBLES ═══');
const d = parser.details ?? {};
const serials = {
  aeronave:   d.aircraftSn   ?? null,
  camara:     d.cameraSn     ?? null,
  control_rc: d.rcSn         ?? null,
  bateria:    d.batterySn    ?? null,
};
console.log(JSON.stringify(serials, null, 2));

// Buscar seriales adicionales en records
console.log('\nSeriales en raw records:');
function searchSerials(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${k}` : k;
    if (/sn$|serial|_sn/i.test(k) && typeof v === 'string' && v.length > 5) {
      console.log(`  ${fullPath}: ${v}`);
    }
    if (typeof v === 'object') searchSerials(v, fullPath);
  }
}
for (const [i, r] of records.slice(0, 50).entries()) {
  searchSerials(r, `records[${i}]`);
}

// ═══ 7. OSD — campos de vuelo disponibles ════════════════════
console.log('\n═══ 7. OSD — resumen estadístico ═══');
const osdStats = {};
for (const f of frames) {
  for (const [k, v] of Object.entries(f.osd ?? {})) {
    if (typeof v !== 'number') continue;
    if (!osdStats[k]) osdStats[k] = { min: v, max: v };
    osdStats[k].min = Math.min(osdStats[k].min, v);
    osdStats[k].max = Math.max(osdStats[k].max, v);
  }
}
for (const [k, { min, max }] of Object.entries(osdStats)) {
  console.log(`  ${k}: ${min} → ${max}`);
}
