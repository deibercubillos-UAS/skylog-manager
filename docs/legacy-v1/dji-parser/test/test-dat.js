/**
 * Test script for the DAT parser.
 * Tries DatCon first (if DatCon.jar is in tools/); falls back to the binary parser.
 *
 * Run: node test/test-dat.js [path/to/file.dat]
 * Defaults to samples/*.dat if no path given.
 */

import { readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseDat } from '../parsers/dat.js';
import { parseDatWithDatCon, isDatConAvailable } from '../parsers/datcon.js';
import { toBitaflyEntry, validateEntry } from '../schema/bitafly.js';

const __dir    = path.dirname(fileURLToPath(import.meta.url));
const samplesDir = path.join(__dir, '..', 'samples');

const args = process.argv.slice(2);
const files = args.length
  ? args.map(f => path.resolve(f))
  : readdirSync(samplesDir)
      .filter(f => f.toLowerCase().endsWith('.dat'))
      .map(f => path.join(samplesDir, f));

if (!files.length) {
  console.log('No hay archivos .dat en samples/ — pon un archivo de prueba ahí.');
  process.exit(0);
}

const useDatCon = isDatConAvailable();
console.log(useDatCon
  ? '→ DatCon.jar encontrado. Usando DatCon para el parsing.'
  : '→ DatCon.jar NO encontrado. Usando parser binario nativo.');

for (const file of files) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Archivo: ${path.basename(file)}`);

  if (!statSync(file, { throwIfNoEntry: false })) {
    console.error(`✗ Archivo no encontrado: ${file}`);
    console.error(`  Asegúrate de copiar el .DAT a esa ruta antes de correr el test.`);
    continue;
  }

  console.log(`Tamaño:  ${(statSync(file).size / 1024).toFixed(1)} KB`);
  console.log('─'.repeat(60));

  try {
    let raw;
    if (useDatCon) {
      console.log('Corriendo DatCon...');
      raw = parseDatWithDatCon(file);
    } else {
      raw = parseDat(file);
    }

    const entry = toBitaflyEntry(raw);
    const { valid, errors } = validateEntry(entry);

    if (useDatCon && raw._meta?._datcon) {
      console.log(`\nDatCon CSV: ${raw._meta._datcon.csvPath}`);
      console.log(`Columnas detectadas: ${raw._meta._datcon.columns.join(', ')}`);
    } else if (raw._meta?._diag) {
      console.log('\nDiagnóstico binario:');
      console.log(JSON.stringify(raw._meta._diag, null, 2));
    }

    console.log('\nEntrada Bitafly:');
    const display = { ...entry };
    delete display._meta;
    console.log(JSON.stringify(display, null, 2));

    console.log('\nMeta / telemetría:');
    const meta = { ...entry._meta };
    delete meta._diag;
    delete meta._datcon;
    console.log(JSON.stringify(meta, null, 2));

    if (valid) {
      console.log('\n✓ Entrada válida para Bitafly');
    } else {
      console.log('\n⚠ Advertencias:', errors.join(', '));
    }
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
  }
}
