// Skylog V2.0 — publicar una versión del APK de Android (actualización OTA) con la llave de administración
// (`ADMIN_SECRET`, header `x-admin-key`), para automatizar desde un script de despliegue. La misma operación, con
// sesión de superadmin, está en `/api/admin/releases` (pantalla `/admin/plataforma`). La consulta que hace la app
// (GET /api/app/version, pública) no cambia: lee la misma tabla `app_releases`.
//   POST { versionName, versionCode, apkUrl, releaseNotes?, forceUpdate? } → deja la nueva como vigente.
//   GET  → historial.
import { createAdminClient } from '@/lib/supabaseServer';
import { verifyAdminKey } from '@/lib/adminKey';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { listReleases, publishRelease } from '@/lib/v2/releases';

const deny = () => Response.json({ error: 'No autorizado' }, { status: 401 });

export async function GET(request) {
  if (!verifyAdminKey(request)) return deny();
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  const r = await listReleases(createAdminClient());
  return Response.json(r.json, { status: r.status });
}

export async function POST(request) {
  if (!verifyAdminKey(request)) return deny();
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const r = await publishRelease(createAdminClient(), body);
  return Response.json(r.json, { status: r.status });
}
