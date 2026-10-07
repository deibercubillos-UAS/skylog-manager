#!/usr/bin/env node
// scripts/etl/run.mjs — ETL v1 → V2 (docs/skylog-v2/32-migracion.md §5.4).
//
//   node scripts/etl/run.mjs --source-dir ./export-v1                 # ensayo: calcula e informa, NO escribe (por defecto)
//   V1_DATABASE_URL=postgres://solo_lectura@… node scripts/etl/run.mjs --from-db
//   node scripts/etl/run.mjs --source-dir ./export-v1 --commit        # escribe en el proyecto de V2 (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
//
// Idempotente: lleva `etl_id_map (entidad, id_v1, id_v2)`; correrlo dos veces no duplica.
import path from 'node:path';
import { loadFromDir, loadFromDatabase } from './lib/source.mjs';
import { buildPlan } from './lib/plan.mjs';
import { writeReport } from './lib/report.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

const commit = flag('--commit');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const outDir = value('--out') || path.join('informes', `etl-${stamp}`);

async function main() {
  let tables;
  if (value('--source-dir')) tables = await loadFromDir(value('--source-dir'));
  else if (flag('--from-db')) {
    if (!process.env.V1_DATABASE_URL) throw new Error('Falta V1_DATABASE_URL (usuario de SOLO LECTURA sobre la copia de v1).');
    tables = await loadFromDatabase(process.env.V1_DATABASE_URL);
  } else throw new Error('Indica el origen: --source-dir <carpeta> o --from-db');

  const plan = buildPlan(tables);
  let extra = {};
  let files = null;
  if (commit) {
    const { commitPlan } = await import('./lib/commit.mjs');
    const result = await commitPlan(plan, { log: (m) => console.log(m) });
    extra = result.stats;
    files = result.files;
  }
  const md = writeReport(outDir, plan, { mode: commit ? 'COMMIT' : 'DRY-RUN (no se escribió nada)', extra, files });
  console.log(md);
  console.log(`\nInformes en ${outDir}/`);
}

main().catch((e) => { console.error(`\nETL detenido: ${e.message}`); process.exit(1); });
