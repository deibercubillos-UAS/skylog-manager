/**
 * Deep inspection tool for unknown DAT formats.
 * Dumps raw bytes of the first 3 records of each frequent type
 * so we can identify which fields hold GPS / timestamp data.
 *
 * Run: node test/inspect-dat.js samples/FLY001.DAT
 */

import { readFileSync } from 'fs';
import path from 'path';

const filePath = path.resolve(process.argv[2]);
if (!filePath) { console.error('Uso: node test/inspect-dat.js <archivo.dat>'); process.exit(1); }

const buf = readFileSync(filePath);

// ── 1. Header ASCII strings ──────────────────────────────────
console.log('\n═══ HEADER (primeros 256 bytes como ASCII) ═══');
const headerAscii = buf.slice(0, 256).toString('latin1').replace(/[^\x20-\x7E]/g, '·');
for (let i = 0; i < 256; i += 64) {
  const hex = buf.slice(i, i+64).toString('hex').match(/.{1,2}/g).join(' ');
  const asc = buf.slice(i, i+64).toString('latin1').replace(/[^\x20-\x7E]/g, '·');
  console.log(`[${String(i).padStart(3,'0')}] ${hex}`);
  console.log(`      ${asc}`);
}

// ── 2. Extract all records ────────────────────────────────────
function extractRecords(buf, start) {
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

// Try the best start offset
const startCandidates = [0, 64, 128];
let records = [];
for (const s of startCandidates) {
  const r = extractRecords(buf, s);
  if (r.length > records.length) records = r;
}

// ── 3. Type histogram ─────────────────────────────────────────
const hist = {};
for (const r of records) {
  const k = `0x${r.type.toString(16).padStart(2,'0')}`;
  hist[k] = (hist[k] ?? 0) + 1;
}
const sorted = Object.entries(hist).sort((a,b) => b[1]-a[1]);

console.log('\n═══ TIPOS DE RECORD (top 10) ═══');
for (const [t, c] of sorted.slice(0, 10)) {
  console.log(`  ${t}  → ${c} records`);
}

// ── 4. Dump first 3 records of top 5 types ───────────────────
console.log('\n═══ BYTES CRUDOS POR TIPO (primeros 3 records de cada uno) ═══');

const topTypes = sorted.slice(0, 5).map(([k]) => parseInt(k, 16));

for (const type of topTypes) {
  const recs = records.filter(r => r.type === type).slice(0, 3);
  console.log(`\n── Tipo 0x${type.toString(16).padStart(2,'0')} (${hist['0x'+type.toString(16).padStart(2,'0')]} records) ──`);

  for (const r of recs) {
    const p = r.payload;
    const hexDump = p.slice(0, 48).toString('hex').match(/.{1,2}/g).join(' ');
    console.log(`  offset=${r.offset} payloadLen=${p.length}`);
    console.log(`  hex: ${hexDump}`);

    // Try to interpret as various types
    if (p.length >= 8) {
      const u32_0 = p.readUInt32LE(0);
      const u32_4 = p.readUInt32LE(4);
      const i32_0 = p.readInt32LE(0);
      const i32_4 = p.readInt32LE(4);
      console.log(`  u32LE[0,4]: ${u32_0}, ${u32_4}`);
      console.log(`  i32LE[0,4]: ${i32_0}, ${i32_4}`);
      console.log(`  i32/1e7[0,4]: ${(i32_0/1e7).toFixed(7)}, ${(i32_4/1e7).toFixed(7)}`);
    }
    if (p.length >= 16) {
      const dbe0 = p.readDoubleBE(0);
      const dbe8 = p.readDoubleBE(8);
      const dle0 = p.readDoubleLE(0);
      const dle8 = p.readDoubleLE(8);
      console.log(`  doubleBE[0]: ${dbe0.toFixed(7)}  doubleBE[8]: ${dbe8.toFixed(7)}`);
      console.log(`  doubleLE[0]: ${dle0.toFixed(7)}  doubleLE[8]: ${dle8.toFixed(7)}`);
    }
    // Timestamp guesses
    if (p.length >= 8) {
      const bigUInt = Number(p.readBigUInt64LE(0));
      const asDate  = bigUInt > 1e12 && bigUInt < 2e12 ? new Date(bigUInt).toISOString() : 'no parece timestamp ms';
      const asDateS = (u32 => u32 > 1514764800 && u32 < 1893456000 ? new Date(u32*1000).toISOString() : 'no')(p.readUInt32LE(0));
      console.log(`  uint64LE[0] como ms epoch: ${asDate}`);
      console.log(`  uint32LE[0] como s epoch:  ${asDateS}`);
    }
  }
}

// ── 5. Search for GPS-like values anywhere ───────────────────
console.log('\n═══ BÚSQUEDA DE COORDENADAS GPS (lat ≈ 0–12°, lng ≈ -80 a -65°) ═══');
// Colombia bounding box: lat 12.5 to -4, lng -79 to -66
let gpsFound = 0;
for (const r of records.slice(0, 500)) {
  const p = r.payload;
  for (let i = 0; i + 8 <= p.length; i += 2) {
    // Try int32/1e7
    if (i + 8 <= p.length) {
      const latI = p.readInt32LE(i) / 1e7;
      const lngI = p.readInt32LE(i + 4) / 1e7;
      if (latI > -5 && latI < 13 && lngI > -80 && lngI < -65) {
        console.log(`  ENCONTRADO (int32/1e7) en type=0x${r.type.toString(16).padStart(2,'0')} offset=${r.offset} payload[${i}]: lat=${latI.toFixed(6)}, lng=${lngI.toFixed(6)}`);
        gpsFound++;
        if (gpsFound > 10) { console.log('  ... (truncado)'); break; }
      }
    }
    // Try double BE
    if (i + 16 <= p.length) {
      const latD = p.readDoubleBE(i);
      const lngD = p.readDoubleBE(i + 8);
      if (latD > -5 && latD < 13 && lngD > -80 && lngD < -65) {
        console.log(`  ENCONTRADO (doubleBE) en type=0x${r.type.toString(16).padStart(2,'0')} offset=${r.offset} payload[${i}]: lat=${latD.toFixed(6)}, lng=${lngD.toFixed(6)}`);
        gpsFound++;
        if (gpsFound > 10) { console.log('  ... (truncado)'); break; }
      }
    }
  }
  if (gpsFound > 10) break;
}
if (!gpsFound) console.log('  No se encontraron coords GPS en los primeros 500 records. ¿El vuelo fue en Colombia?');
