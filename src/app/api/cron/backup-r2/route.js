// GET /api/cron/backup-r2 — Vercel Cron (diario). Volcado completo de las tablas de `public` y de los usuarios de `auth`
// (con sus contraseñas cifradas) a un solo archivo comprimido `AAAA-MM-DD.json.gz` en el bucket privado de respaldos de R2.
// Guarda 35 días: cada corrida borra el de hace 35 días. Pensado para el plan gratuito de Supabase, que no trae copias.
// Formato: { generado_en, tablas: { <tabla>: [filas…] } }. Secured con Authorization: Bearer CRON_SECRET.
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { createAdminClient } from '@/lib/supabaseServer';
import { storagePut, storageRemove } from '@/lib/storage';
import { bogotaDay } from '@/lib/v2/dispatchContext';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const gzip = promisify(zlib.gzip);
const KEEP_DAYS = 35;

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

const dayMinus = (day, n) => new Date(new Date(`${day}T12:00:00Z`).getTime() - n * 86_400_000).toISOString().slice(0, 10);

export async function GET(request) {
  if (!verifyAuth(request)) return Response.json({ error: 'No autorizado' }, { status: 401 });
  const bucket = process.env.R2_BUCKET_BACKUPS;
  if (!bucket || !process.env.R2_ENDPOINT) return Response.json({ error: 'Respaldo sin configurar: faltan R2_BUCKET_BACKUPS o las credenciales de R2.', setup: true }, { status: 503 });

  const admin = createAdminClient();
  const { data: names, error: namesError } = await admin.rpc('v2_backup_table_names');
  if (namesError) return Response.json({ error: `No se pudo listar las tablas: ${namesError.message}` }, { status: 500 });

  const tablas = {};
  const failed = [];
  for (const name of [...(names || []), 'auth_users']) {
    const { data, error } = await admin.rpc('v2_backup_dump', { p_tabla: name });
    if (error) failed.push({ table: name, error: error.message });
    else tablas[name] = data;
  }
  // Un respaldo incompleto no se sube como si estuviera bien: se avisa y no se borra ninguno anterior.
  if (failed.length) return Response.json({ error: 'Respaldo incompleto: no se subió.', failed }, { status: 500 });

  const today = bogotaDay();
  const body = await gzip(Buffer.from(JSON.stringify({ generado_en: new Date().toISOString(), tablas })));
  const key = `${today}.json.gz`;
  const put = await storagePut({ bucket, key, body, contentType: 'application/gzip' });
  if (put.error) return Response.json({ error: `No se pudo subir a R2: ${put.error.message || put.error}` }, { status: 502 });

  const old = `${dayMinus(today, KEEP_DAYS)}.json.gz`;
  await storageRemove({ bucket, keys: [old] }).catch(() => {});
  const rows = Object.values(tablas).reduce((n, t) => n + (t?.length || 0), 0);
  return Response.json({ ok: true, key, tables: Object.keys(tablas).length, rows, bytes: body.length });
}
