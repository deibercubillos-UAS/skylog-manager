#!/usr/bin/env node
// Respaldo LÓGICO de la v1 antes del corte (no depende del plan de Supabase): todas las tablas de `public` y los usuarios de
// `auth` (con su contraseña cifrada) como un JSON por tabla, comprimido. Solo lee, con el rol del ETL (`V1_DATABASE_URL`).
// Uso: V1_DATABASE_URL=… node scripts/cutover/respaldo-v1.mjs [carpeta]   (por defecto: respaldos/v1-AAAAMMDD-hhmm)
// La carpeta contiene datos de clientes y contraseñas cifradas: está en .gitignore; guardarla fuera de línea además.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const url = process.env.V1_DATABASE_URL;
if (!url) throw new Error('Falta V1_DATABASE_URL (rol de solo lectura del ETL).');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const out = process.argv[2] || path.join('respaldos', `v1-${stamp.slice(0, 8)}-${stamp.slice(8)}`);
fs.mkdirSync(out, { recursive: true, mode: 0o700 });

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('set default_transaction_read_only = on');
  const names = (await client.query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1")).rows.map((r) => r.table_name);
  const summary = {};
  for (const name of [...names, 'auth_users']) {
    const rows = (await client.query('select r as row from public.etl_leer_tabla($1) r', [name])).rows.map((x) => x.row);
    fs.writeFileSync(path.join(out, `${name}.json.gz`), zlib.gzipSync(JSON.stringify(rows)), { mode: 0o600 });
    summary[name] = rows.length;
  }
  fs.writeFileSync(path.join(out, 'RESUMEN.json'), JSON.stringify({ generado_en: new Date().toISOString(), tablas: summary }, null, 2));
  const total = Object.values(summary).reduce((a, b) => a + b, 0);
  console.log(`${out}: ${Object.keys(summary).length} tablas, ${total} filas`);
} finally {
  await client.end();
}
