/**
 * Test dji-log-parser-js with our DAT/TXT file.
 * Phase 1: read metadata (no API key needed).
 * Phase 2: if DJI_API_KEY env var is set, decrypt full frames.
 *
 * Run: node test/test-djilogjs.js samples/FLY001.DAT
 *      DJI_API_KEY=xxx node test/test-djilogjs.js samples/FLY001.DAT
 */

import 'dotenv/config';
import { DJILog } from 'dji-log-parser-js';
import { readFileSync } from 'fs';
import path from 'path';

const filePath = path.resolve(process.argv[2]);
if (!filePath) { console.error('Uso: node test/test-djilogjs.js <archivo>'); process.exit(1); }

const buffer = readFileSync(filePath);

let parser;
try {
  parser = new DJILog(buffer);
} catch (e) {
  console.error('Error al inicializar DJILog:', e.message);
  process.exit(1);
}

// ── Metadata (always available, no API key) ───────────────────
console.log('\n═══ VERSIÓN Y METADATA (sin cifrado) ═══');
console.log('Version:', parser.version);

let details;
try {
  details = parser.details;
  console.log('\nDetails:');
  console.log(JSON.stringify(details, null, 2));
} catch (e) {
  console.log('details no disponible:', e.message);
}

// ── Frames (requieren keychain para v13+) ─────────────────────
const apiKey = process.env.DJI_API_KEY;

if (!apiKey) {
  console.log('\n═══ FRAMES (cifradas) ═══');
  console.log('Para descifrar los records, necesitas una DJI API Key.');
  console.log('Cómo obtenerla:');
  console.log('  1. Entra a https://developer.dji.com/user');
  console.log('  2. Crea una app con tipo "Open API"');
  console.log('  3. Activa la app por email');
  console.log('  4. Copia el SDK Key');
  console.log('  5. Corre: DJI_API_KEY=tu_key node test/test-djilogjs.js samples/FLY001.DAT');
  process.exit(0);
}

console.log('\n═══ DESCIFRADO CON API KEY ═══');
try {
  const keychains = await parser.fetchKeychains(apiKey);
  console.log('Keychains obtenidos:', JSON.stringify(keychains).slice(0, 200));

  const frames = parser.frames(keychains);
  console.log(`\nTotal frames: ${frames.length}`);

  if (frames.length > 0) {
    console.log('\nPrimer frame:');
    console.log(JSON.stringify(frames[0], null, 2));

    console.log('\nÚltimo frame:');
    console.log(JSON.stringify(frames[frames.length - 1], null, 2));

    // Find first frame with GPS
    const withGps = frames.filter(f => f.osd?.latitude && f.osd.latitude !== 0);
    if (withGps.length) {
      console.log(`\nGPS encontrado en ${withGps.length} frames.`);
      console.log('Primer GPS:', { lat: withGps[0].osd.latitude, lng: withGps[0].osd.longitude });
    }
  }
} catch (e) {
  console.error('Error al descifrar:', e.message);
}
