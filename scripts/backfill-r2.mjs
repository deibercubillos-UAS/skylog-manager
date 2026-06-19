/**
 * backfill-r2.mjs — Copia objetos de Supabase Storage → Cloudflare R2
 *
 * Uso:
 *   node scripts/backfill-r2.mjs [bucket]
 *
 * Si se omite el bucket, corre el piloto: flight-replays
 *
 * Requiere en el entorno (o en .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_ENDPOINT
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *
 * Comportamiento:
 *  - Lista todos los objetos del bucket en Supabase Storage.
 *  - Por cada objeto, comprueba si ya existe en R2 (HeadObject) → lo omite.
 *  - Descarga el objeto de Supabase y lo sube a R2 con la misma key.
 *  - Procesa en lotes de BATCH_SIZE para no saturar la memoria.
 *  - Idempotente: relanzar el script omite los ya copiados.
 *  - Imprime un resumen al final.
 */

import { createClient } from '@supabase/supabase-js';
import {
  S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── Cargar .env.local si existe ──────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ── Config ───────────────────────────────────────────────────────────────────
const BUCKET      = process.argv[2] || 'flight-replays';
const BATCH_SIZE  = 20;   // objetos procesados en paralelo por lote
const MAX_RETRIES = 3;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(msg, ...args) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] ${msg}`, ...args);
}

async function r2Exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function withRetry(fn, label) {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === MAX_RETRIES) throw err;
      log(`  ⚠ retry ${i}/${MAX_RETRIES} para "${label}": ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}

// ── Listar todos los objetos de Supabase Storage ─────────────────────────────
// La API de listFiles pagina a 100 items. Iteramos hasta agotar.
async function listAllObjects() {
  const all = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw new Error(`list error: ${error.message}`);
    if (!data || data.length === 0) break;
    // Supabase devuelve carpetas (sin metadata.size) y archivos juntos.
    // Filtrar solo archivos reales y recursivamente explorar carpetas.
    const files = data.filter(o => o.metadata?.size !== undefined || o.name.endsWith('.gz'));
    const folders = data.filter(o => o.metadata?.size === undefined && !o.name.endsWith('.gz'));
    all.push(...files.map(f => f.name));
    // Para carpetas, recursión manual (la API no es recursiva en el nivel raíz).
    for (const folder of folders) {
      await collectFolder(folder.name, all);
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function collectFolder(prefix, acc) {
  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data || data.length === 0) break;
    for (const o of data) {
      const fullKey = `${prefix}/${o.name}`;
      if (o.metadata?.size !== undefined || o.name.endsWith('.gz')) {
        acc.push(fullKey);
      } else {
        await collectFolder(fullKey, acc);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
}

// ── Copiar un objeto Supabase → R2 ───────────────────────────────────────────
async function copyObject(key) {
  // Descargar de Supabase
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(key);
  if (dlErr || !blob) throw new Error(`download "${key}": ${dlErr?.message}`);

  const body = Buffer.from(await blob.arrayBuffer());

  // Determinar content-type a partir del nombre
  let contentType = 'application/octet-stream';
  if (key.endsWith('.gz'))   contentType = 'application/gzip';
  if (key.endsWith('.json')) contentType = 'application/json';
  if (key.endsWith('.pdf'))  contentType = 'application/pdf';

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body, ContentType: contentType,
  }));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log(`=== Backfill: Supabase Storage → R2  |  bucket: ${BUCKET} ===`);

  // Validar credenciales
  for (const v of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) {
    if (!process.env[v]) { console.error(`Falta variable: ${v}`); process.exit(1); }
  }

  log('Listando objetos en Supabase Storage...');
  const keys = await listAllObjects();
  log(`Encontrados: ${keys.length} objetos`);

  if (keys.length === 0) {
    log('Nada que copiar. Fin.');
    return;
  }

  let copied = 0, skipped = 0, failed = 0;
  const errors = [];

  // Procesar en lotes
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const pct = Math.round((i / keys.length) * 100);
    log(`Lote ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(keys.length / BATCH_SIZE)}  (${pct}%)`);

    await Promise.all(batch.map(async (key) => {
      try {
        const exists = await r2Exists(key);
        if (exists) {
          skipped++;
          return;
        }
        await withRetry(() => copyObject(key), key);
        copied++;
        log(`  ✓ ${key}`);
      } catch (err) {
        failed++;
        errors.push({ key, err: err.message });
        log(`  ✗ ${key}: ${err.message}`);
      }
    }));
  }

  log('');
  log(`=== Resumen ===`);
  log(`  Copiados : ${copied}`);
  log(`  Omitidos : ${skipped} (ya existían en R2)`);
  log(`  Errores  : ${failed}`);
  if (errors.length > 0) {
    log('  Detalle de errores:');
    for (const { key, err } of errors) log(`    - ${key}: ${err}`);
    process.exit(1);
  }
  log('Backfill completado sin errores.');
}

main().catch(err => { console.error(err); process.exit(1); });
