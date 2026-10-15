/**
 * Focused GPS + timestamp inspection for DJI_LOG_V3 format.
 * Shows the FULL payload of GPS-bearing records so we can map exact offsets.
 *
 * Run: node test/inspect-gps.js samples/FLY001.DAT
 */

import { readFileSync } from 'fs';
import path from 'path';

const filePath = path.resolve(process.argv[2]);
const buf = readFileSync(filePath);

// ── extract all records ───────────────────────────────────────
function extractRecords(buf, start = 0) {
  const records = [];
  let offset = start;
  while (offset + 4 < buf.length) {
    const len  = buf.readUInt16LE(offset);
    const type = buf[offset + 2];
    if (len < 4 || len > 512 || offset + len > buf.length) { offset++; continue; }
    records.push({ type, payload: buf.slice(offset + 3, offset + 3 + len - 3), offset, len });
    offset += len;
  }
  return records;
}

const records = extractRecords(buf);
console.log(`Total records: ${records.length}`);

// ── scan ALL payloads for Colombia-region GPS ─────────────────
// Broad box: lat -5 to 13, lng -82 to -60 (covers Colombia, Venezuela, Ecuador)
const gpsHits = [];

for (const r of records) {
  const p = r.payload;
  for (let i = 0; i + 8 <= p.length; i++) {          // step by 1 for thoroughness
    const latI = p.readInt32LE(i) / 1e7;
    const lngI = p.readInt32LE(i + 4) / 1e7;
    if (latI > -5 && latI < 13 && lngI > -82 && lngI < -60 &&
        latI !== 0 && lngI !== 0) {
      gpsHits.push({ type: r.type, fileOffset: r.offset, payloadOffset: i, lat: latI, lng: lngI, payload: p });
    }
  }
}

console.log(`\nGPS hits encontrados: ${gpsHits.length}`);

// ── group by type + payloadOffset to find consistent patterns ─
const patterns = {};
for (const h of gpsHits) {
  const key = `type=0x${h.type.toString(16).padStart(2,'0')}@offset=${h.payloadOffset}`;
  if (!patterns[key]) patterns[key] = [];
  patterns[key].push(h);
}

console.log('\n═══ PATRONES GPS (agrupado por tipo + offset en payload) ═══');
for (const [key, hits] of Object.entries(patterns).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`  ${key}  → ${hits.length} coincidencias`);
  console.log(`    Primeras coords: lat=${hits[0].lat.toFixed(6)}, lng=${hits[0].lng.toFixed(6)}`);
  if (hits.length > 1) console.log(`    Últimas  coords: lat=${hits[hits.length-1].lat.toFixed(6)}, lng=${hits[hits.length-1].lng.toFixed(6)}`);
}

// ── show full payload of the most consistent GPS type ────────
const bestPattern = Object.entries(patterns).sort((a,b) => b[1].length - a[1].length)[0];
if (!bestPattern) { console.log('Sin patrones GPS.'); process.exit(0); }

const [bestKey, bestHits] = bestPattern;
const bestType        = bestHits[0].type;
const bestPldOffset   = bestHits[0].payloadOffset;

console.log(`\n═══ PAYLOAD COMPLETO — ${bestKey} (primer record) ═══`);
const firstHit = bestHits[0];
const p = firstHit.payload;
console.log(`Tipo: 0x${bestType.toString(16).padStart(2,'0')}  fileOffset: ${firstHit.fileOffset}  payloadLen: ${p.length}`);
const fullHex = Array.from(p).map((b,i) => {
  const marker = (i === bestPldOffset || i === bestPldOffset+4) ? '►' : ' ';
  return `${marker}[${String(i).padStart(2,'0')}]=0x${b.toString(16).padStart(2,'0')}`;
});
// Print 4 per line
for (let i = 0; i < fullHex.length; i += 4) console.log('  ' + fullHex.slice(i, i+4).join('  '));

// ── timestamp hunt in the most frequent GPS record type ───────
console.log('\n═══ BÚSQUEDA DE TIMESTAMP EN RECORDS GPS ═══');
const gpsTypeRecords = records.filter(r => r.type === bestType).slice(0, 5);
for (const r of gpsTypeRecords) {
  console.log(`\nfileOffset=${r.offset}:`);
  const p2 = r.payload;
  for (let i = 0; i + 4 <= p2.length; i++) {
    const u32 = p2.readUInt32LE(i);
    // Unix seconds range: 2020-01-01 to 2030-01-01
    if (u32 > 1577836800 && u32 < 1893456000) {
      console.log(`  ✓ uint32LE[${i}] = ${u32} → ${new Date(u32*1000).toISOString()}`);
    }
    // Unix millis range
    if (i + 8 <= p2.length) {
      const u64 = Number(p2.readBigUInt64LE(i));
      if (u64 > 1577836800000 && u64 < 1893456000000) {
        console.log(`  ✓ uint64LE[${i}] = ${u64} → ${new Date(u64).toISOString()}`);
      }
    }
  }
}

// ── also check header for timestamps ─────────────────────────
console.log('\n═══ TIMESTAMPS EN EL HEADER (primeros 512 bytes) ═══');
for (let i = 0; i + 4 <= Math.min(512, buf.length); i++) {
  const u32 = buf.readUInt32LE(i);
  if (u32 > 1577836800 && u32 < 1893456000) {
    console.log(`  header[${i}] uint32LE = ${u32} → ${new Date(u32*1000).toISOString()}`);
  }
}
