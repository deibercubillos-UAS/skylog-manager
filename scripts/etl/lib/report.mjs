// scripts/etl/lib/report.mjs — informes de cada corrida (32-migracion.md §5.4). Una carpeta por corrida.
import fs from 'node:fs';
import path from 'node:path';

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => {
  if (!rows.length) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
};

export function writeReport(dir, plan, { mode, extra = {} }) {
  fs.mkdirSync(dir, { recursive: true });
  const r = plan.report;
  const write = (name, rows) => fs.writeFileSync(path.join(dir, name), toCsv(rows));
  write('conteos.csv', Object.entries(r.counts).map(([entity, c]) => ({ entity, ...c })));
  write('identidad.csv', r.identity);
  write('omitidas.csv', r.omitted);
  write('avisos.csv', r.warnings);
  write('revision-manual.csv', r.manual);
  write('suscripciones-a-confirmar.csv', r.flags);
  write('horas-aeronaves.csv', r.hoursCheck || []);
  const off = (r.hoursCheck || []).filter((h) => Math.abs(h.difference) > 0.01);
  const md = [
    `# Informe del ETL — ${mode}`, '',
    `Fecha: ${new Date().toISOString()}`, '',
    '## Conteos (v1 = migradas + omitidas con motivo)', '',
    '| Entidad | v1 | Migradas | Omitidas |', '|---|---|---|---|',
    ...Object.entries(r.counts).map(([e, c]) => `| ${e} | ${c.source} | ${c.migrated} | ${c.omitted} |`), '',
    `## Para revisar a mano: ${r.manual.length}`, '',
    ...Object.entries(r.manual.reduce((a, m) => ((a[m.kind] = (a[m.kind] || 0) + 1), a), {})).map(([k, n]) => `- ${k}: ${n}`), '',
    `## Suscripciones a confirmar una por una (decisión C): ${r.flags.length}`, '',
    `## Avisos: ${r.warnings.length} · Omitidas: ${r.omitted.length}`, '',
    `## Horas: ${off.length} aeronave(s) con odómetro distinto de la suma de sus vuelos migrados`, '',
    ...r.notes.map((n) => `- ${n}`), '',
    ...(Object.keys(extra).length ? ['## Resultado de la escritura', '', '```json', JSON.stringify(extra, null, 2), '```', ''] : []),
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'INFORME.md'), md);
  return md;
}
