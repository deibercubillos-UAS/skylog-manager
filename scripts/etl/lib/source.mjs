// scripts/etl/lib/source.mjs — lectura de v1. Dos modos, ambos SOLO LECTURA:
//   · carpeta con un `<tabla>.json` por tabla (un export, o los datos sintéticos de los ensayos del propio ETL);
//   · base de datos v1 con `V1_DATABASE_URL` (usuario de solo lectura sobre la COPIA de producción; nunca la llave de servicio).
import fs from 'node:fs';
import path from 'node:path';

// Tablas de v1 que el ETL lee. `auth_users` sale de `auth.users` y trae el hash de contraseña.
export const V1_TABLES = [
  'organizations', 'organization_members', 'profiles', 'pilots', 'aircraft', 'batteries', 'aircraft_components', 'flight_authorizations',
  'flights', 'insurance_policies', 'partners', 'partner_codes', 'partner_members', 'free_grants', 'referrals', 'referral_commissions', 'app_releases', 'colombia_geo',
  // fase 2
  'maintenance_logs', 'emergency_contacts', 'suppliers', 'supplier_audit_criteria', 'supplier_audits', 'company_manuals', 'manual_versions',
  'manual_acknowledgments', 'form_definitions', 'protocols',
  // SMS
  'sms_reports', 'vor_mor_submissions', 'sms_case_actions', 'sms_case_events', 'safety_hazards', 'safety_barriers',
];

// El hash de contraseña NO se archiva (solo viaja a la cuenta nueva).
const stripSecrets = (name, rows) => (name === 'auth_users' ? rows.map(({ encrypted_password, ...rest }) => rest) : rows);

export async function loadFromDir(dir) {
  const tables = {};
  const archive = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const name = file.replace(/\.json$/, '');
    archive[name] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  for (const name of [...V1_TABLES, 'auth_users']) tables[name] = archive[name] || [];
  tables.__archive = Object.fromEntries(Object.entries(archive).map(([n, rows]) => [n, stripSecrets(n, rows)]));
  return tables;
}

export async function loadFromDatabase(url) {
  const { default: pg } = await import('pg'); // se instala solo para correr el ETL: `npm i -D pg`
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('set default_transaction_read_only = on'); // defensa en profundidad: aunque el usuario pudiera escribir, esta sesión no
    // La RLS oculta las filas a un rol común y Supabase no permite darle bypass: se lee con la función de solo lectura
    // `public.etl_leer_tabla(tabla)` (SECURITY DEFINER, solo ejecutable por el rol del ETL — README).
    const read = async (name) => (await client.query('select r as row from public.etl_leer_tabla($1) r', [name])).rows.map((x) => x.row);
    const all = (await client.query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1")).rows.map((r) => r.table_name);
    const tables = {};
    const archive = {};
    for (const name of all) archive[name] = await read(name);
    for (const name of V1_TABLES) tables[name] = archive[name] ?? (await read(name));
    tables.auth_users = await read('auth_users');
    archive.auth_users = stripSecrets('auth_users', tables.auth_users);
    tables.__archive = archive;
    return tables;
  } finally {
    await client.end();
  }
}
