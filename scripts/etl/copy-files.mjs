#!/usr/bin/env node
// scripts/etl/copy-files.mjs — copia los archivos de v1 a su clave nueva en R2 (32-migracion.md §5.3), R2 → R2 sin
// descargarlos, y verifica el tamaño. Lee el manifiesto `archivos-a-copiar.csv` que deja el ETL con --commit.
// Los objetos de v1 NO se borran (conservación, §7). Idempotente: si el destino ya existe con el mismo tamaño, lo salta.
//
//   node --env-file=.env.local scripts/etl/copy-files.mjs informes/etl-AAAAMMDDhhmm/archivos-a-copiar.csv          # solo comprueba
//   node --env-file=.env.local scripts/etl/copy-files.mjs informes/etl-AAAAMMDDhhmm/archivos-a-copiar.csv --commit # copia
// Necesita R2_ENDPOINT, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY (la misma cuenta que usa v1).
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

async function main() {
  const [manifest] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const commit = process.argv.includes('--commit');
  if (!manifest) throw new Error('Indica el archivo archivos-a-copiar.csv');
  for (const k of ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) if (!process.env[k]) throw new Error(`Falta ${k}`);
  const s3 = new S3Client({ region: 'auto', endpoint: process.env.R2_ENDPOINT, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  const head = async (Bucket, Key) => { try { return (await s3.send(new HeadObjectCommand({ Bucket, Key }))).ContentLength; } catch { return null; } };

  const items = parseCsv(fs.readFileSync(manifest, 'utf8')).filter((r) => r.to_key);
  const out = [];
  for (const it of items) {
    const size = await head(it.from_bucket, it.from_key);
    if (size === null) { out.push({ ...it, status: 'FALTA EL ORIGEN', size: '' }); continue; }
    const existing = await head(it.to_bucket, it.to_key);
    if (existing === size) { out.push({ ...it, status: 'ya copiado', size }); continue; }
    if (!commit) { out.push({ ...it, status: 'por copiar', size }); continue; }
    try {
      await s3.send(new CopyObjectCommand({ Bucket: it.to_bucket, Key: it.to_key, CopySource: `${it.from_bucket}/${encodeURIComponent(it.from_key).replace(/%2F/g, '/')}` }));
      const after = await head(it.to_bucket, it.to_key);
      out.push({ ...it, status: after === size ? 'copiado' : `TAMAÑO DISTINTO (${after} ≠ ${size})`, size });
    } catch (e) { out.push({ ...it, status: `ERROR: ${e.message}`, size }); }
  }
  const dest = path.join(path.dirname(manifest), 'archivos-resultado.csv');
  const cols = ['entity', 'id_v1', 'from_bucket', 'from_key', 'to_bucket', 'to_key', 'size', 'status'];
  fs.writeFileSync(dest, [cols.join(','), ...out.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n') + '\n');
  const bad = out.filter((r) => !/^(copiado|ya copiado|por copiar)$/.test(r.status));
  console.log(`${out.length} archivo(s): ${out.filter((r) => r.status === 'copiado').length} copiados, ${out.filter((r) => r.status === 'ya copiado').length} ya estaban, ${out.filter((r) => r.status === 'por copiar').length} por copiar, ${bad.length} con problema → ${dest}`);
  if (bad.length) process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('copy-files.mjs')) main().catch((e) => { console.error(`copy-files detenido: ${e.message}`); process.exit(1); });
