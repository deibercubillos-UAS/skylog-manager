/**
 * DJI Parser — entry point
 *
 * Usage:
 *   node index.js <path-to-file.dat|.txt>
 *
 * Env:
 *   DJI_API_KEY  — required for encrypted TXT (v13+)
 */

import 'dotenv/config';
import path from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { parseDat } from './parsers/dat.js';
import { parseTxt } from './parsers/txt.js';
import { parseDatWithDatCon, isDatConAvailable } from './parsers/datcon.js';
import { isEncryptedTxt, parseTxtEncrypted } from './parsers/txt-encrypted.js';
import { toBitaflyEntry, validateEntry } from './schema/bitafly.js';

const [,, filePath] = process.argv;

if (!filePath) {
  console.error('Uso: node index.js <archivo.dat|archivo.txt>');
  process.exit(1);
}

const absPath = path.resolve(filePath);
const ext     = path.extname(absPath).toLowerCase();

let raw;
try {
  if (ext === '.dat') {
    raw = isDatConAvailable()
      ? parseDatWithDatCon(absPath)
      : parseDat(absPath);
  } else if (ext === '.txt') {
    if (isEncryptedTxt(absPath)) {
      raw = await parseTxtEncrypted(absPath);
    } else {
      raw = parseTxt(absPath);
    }
  } else {
    console.error(`Extensión no soportada: ${ext}. Usa .dat o .txt`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Error al parsear: ${err.message}`);
  process.exit(1);
}

const entry = toBitaflyEntry(raw);
const { valid, errors } = validateEntry(entry);

const result = { entry, valid, errors: errors.length ? errors : undefined };

console.log(JSON.stringify(result, null, 2));

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'output');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, path.basename(absPath, ext) + '.json');
writeFileSync(outFile, JSON.stringify(result, null, 2), 'utf-8');
console.error(`\n→ Guardado en: ${outFile}`);
