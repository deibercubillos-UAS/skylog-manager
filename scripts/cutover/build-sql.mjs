#!/usr/bin/env node
// Arma el SQL que instala la base V2 en `public` después del congelado: base + semilla + migraciones posteriores a la base.
// Uso: node scripts/cutover/build-sql.mjs [salida.sql]   (por defecto: informes/cutover-v2.sql)
import fs from 'node:fs';
import path from 'node:path';

const FIRST_AFTER_BASELINE = '20261009110000';
const out = process.argv[2] || 'informes/cutover-v2.sql';
const parts = [
  ['base', 'supabase/baseline/00_v2_baseline.sql'],
  ['semilla GAP', 'supabase/baseline/10_seed_sms_gap_questions.sql'],
  ...fs.readdirSync('supabase/migrations')
    .filter((f) => f.endsWith('.sql') && f.slice(0, 14) >= FIRST_AFTER_BASELINE)
    .sort()
    .map((f) => [f, path.join('supabase/migrations', f)]),
];
const sql = parts.map(([name, file]) => `-- ═════ ${name} (${file}) ═════\n${fs.readFileSync(file, 'utf8')}`).join('\n\n');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `-- Generado por scripts/cutover/build-sql.mjs — ${parts.length} archivos.\nbegin;\n${sql}\ncommit;\n`);
console.log(`${out}: ${parts.length} archivos, ${(sql.length / 1024).toFixed(0)} KB`);
