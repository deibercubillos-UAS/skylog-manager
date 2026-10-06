// Skylog V2.0 — publicar una versión del APK de Android (actualización OTA). V2 no tiene panel de superadmin, así
// que la publicación se hace con una llave de administración (`ADMIN_SECRET`, header `x-admin-key`), igual que las
// rutas internas de v1. La consulta que hace la app (GET /api/app/version, pública) NO cambia: lee la misma tabla
// `app_releases`, que ahora existe en el proyecto de V2 con su política de lectura pública de la fila vigente.
//   POST { versionName, versionCode, apkUrl, releaseNotes?, forceUpdate? } → deja la nueva como vigente.
//   GET  → historial.
import { createAdminClient } from '@/lib/supabaseServer';
import { verifyAdminKey } from '@/lib/adminKey';
import { adminKeyProblem } from '@/lib/v2/adminKey';

const deny = () => Response.json({ error: 'No autorizado' }, { status: 401 });

export async function GET(request) {
  if (!verifyAdminKey(request)) return deny();
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  const { data, error } = await createAdminClient().from('app_releases').select('*').order('version_code', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ releases: data || [] });
}

export async function POST(request) {
  if (!verifyAdminKey(request)) return deny();
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const { versionName, versionCode, apkUrl, releaseNotes, forceUpdate } = await request.json().catch(() => ({}));
  const code = Number(versionCode);
  if (!versionName?.trim() || !Number.isInteger(code) || code <= 0 || !apkUrl?.trim()) {
    return Response.json({ error: 'versionName, versionCode (entero positivo) y apkUrl son requeridos' }, { status: 400 });
  }
  if (!/^https:\/\//.test(apkUrl.trim())) return Response.json({ error: 'apkUrl debe ser una URL https' }, { status: 400 });

  const admin = createAdminClient();
  // La app compara versionCode: una versión menor o igual a la vigente nunca se ofrecería como actualización.
  const { data: current } = await admin.from('app_releases').select('version_code').eq('is_current', true).order('version_code', { ascending: false }).limit(1).maybeSingle();
  if (current && code <= current.version_code) {
    return Response.json({ error: `versionCode debe ser mayor que el vigente (${current.version_code})` }, { status: 409 });
  }

  await admin.from('app_releases').update({ is_current: false }).eq('is_current', true);
  const { data, error } = await admin
    .from('app_releases')
    .insert({ version_name: versionName.trim(), version_code: code, apk_url: apkUrl.trim(), release_notes: releaseNotes?.trim() || null, force_update: !!forceUpdate, is_current: true })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ release: data });
}
