// scripts/etl/lib/source.mjs — lectura de v1. Dos modos, ambos SOLO LECTURA:
//   · carpeta con un `<tabla>.json` por tabla (un export, o los datos sintéticos de los ensayos del propio ETL);
//   · base de datos v1 con `V1_DATABASE_URL` (usuario de solo lectura sobre la COPIA de producción; nunca la llave de servicio).
import fs from 'node:fs';
import path from 'node:path';

// Tablas de v1 que el ETL lee. `auth_users` sale de `auth.users` y trae el hash de contraseña.
export const V1_TABLES = [
  'organizations', 'organization_members', 'profiles', 'pilots', 'aircraft', 'batteries', 'aircraft_components', 'flight_authorizations',
  'flights', 'insurance_policies', 'partners', 'partner_codes', 'partner_members', 'free_grants', 'referrals', 'referral_commissions', 'app_releases', 'colombia_geo',
];

export async function loadFromDir(dir) {
  const tables = {};
  for (const name of [...V1_TABLES, 'auth_users']) {
    const file = path.join(dir, `${name}.json`);
    tables[name] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  }
  return tables;
}

export async function loadFromDatabase(url) {
  const { default: pg } = await import('pg'); // se instala solo para correr el ETL: `npm i -D pg`
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('set default_transaction_read_only = on'); // defensa en profundidad: aunque el usuario pudiera escribir, esta sesión no
    const tables = {};
    for (const name of V1_TABLES) tables[name] = (await client.query(`select * from public.${name}`)).rows;
    tables.auth_users = (await client.query('select id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at from auth.users')).rows;
    return tables;
  } finally {
    await client.end();
  }
}
