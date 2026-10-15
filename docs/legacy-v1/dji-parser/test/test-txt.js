/**
 * Test script for TXT parsers.
 * Auto-detects encrypted (v13+) vs plain CSV TXT files.
 *
 * Run: node test/test-txt.js [path/to/file.txt]
 * Defaults to samples/*.txt if no path given.
 */

import 'dotenv/config';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTxt } from '../parsers/txt.js';
import { isEncryptedTxt, parseTxtEncrypted } from '../parsers/txt-encrypted.js';
import { toBitaflyEntry, validateEntry } from '../schema/bitafly.js';

const __dir     = path.dirname(fileURLToPath(import.meta.url));
const samplesDir = path.join(__dir, '..', 'samples');

const args = process.argv.slice(2);
const files = args.length
  ? args.map(f => path.resolve(f))
  : readdirSync(samplesDir)
      .filter(f => f.toLowerCase().endsWith('.txt'))
      .map(f => path.join(samplesDir, f));

if (!files.length) {
  console.log('No hay archivos .txt en samples/');
  process.exit(0);
}

for (const file of files) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Archivo: ${path.basename(file)}`);

  if (!statSync(file, { throwIfNoEntry: false })) {
    console.error(`✗ Archivo no encontrado: ${file}`);
    continue;
  }

  const encrypted = isEncryptedTxt(file);
  console.log(`Tipo:    ${encrypted ? 'TXT cifrado v13+ (dji-log-parser-js)' : 'TXT plano CSV'}`);
  console.log('─'.repeat(60));

  try {
    const raw   = encrypted ? await parseTxtEncrypted(file) : parseTxt(file);
    const entry = toBitaflyEntry(raw);
    const { valid, errors } = validateEntry(entry);

    console.log('\nEntrada Bitafly:');
    const display = { ...entry };
    delete display._meta;
    console.log(JSON.stringify(display, null, 2));

    console.log('\nMeta / telemetría:');
    console.log(JSON.stringify(entry._meta, null, 2));

    if (valid) {
      console.log('\n✓ Entrada válida para Bitafly');
    } else {
      console.log('\n⚠ Campos faltantes:', errors.join(', '));
    }
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
  }
}
