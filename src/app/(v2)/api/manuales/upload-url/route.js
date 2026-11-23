// Skylog V2.0 — Manuales: firma una URL de subida directa a R2 para que el
// navegador suba el archivo SIN pasar por la función (evita el tope de ~4.5 MB
// del cuerpo serverless en Vercel). Devuelve { uploadUrl, key }. El cliente
// hace PUT del archivo a `uploadUrl` y luego crea el manual/versión con `key`.
import { randomUUID } from 'crypto';
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { storageUploadUrl } from '@/lib/storage';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { MANUALES_BUCKET, MANUALES_ALLOWED_TYPES, buildManualKey } from '@/lib/v2/manualesUpload';

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const { manualId, contentType, fileName } = body;
  const organizationId = body.organizationId || null;
  const version = body.version;

  if (!contentType || !MANUALES_ALLOWED_TYPES.has(contentType)) {
    return Response.json({ error: 'Formato no soportado — usa PDF, Word o Excel' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  // Nueva versión de un manual existente (AA5) o manual nuevo (AA4).
  let orgId = organizationId;
  if (manualId) {
    const { data: manual, error: fetchError } = await supabase.from('manuales').select('organization_id').eq('id', manualId).maybeSingle();
    if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
    if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });
    orgId = manual.organization_id;
    if (!membershipsCanEdit(memberships, orgId, 'AA5')) {
      return Response.json({ error: 'Solo un gestor puede publicar nuevas versiones' }, { status: 403 });
    }
  } else {
    if (!orgId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
    if (!membershipsCanEdit(memberships, orgId, 'AA4')) {
      return Response.json({ error: 'Solo un gestor puede cargar manuales' }, { status: 403 });
    }
  }

  const key = buildManualKey({ organizationId: orgId, manualId: manualId || null, version, fileName, token: randomUUID() });
  const { data, error } = await storageUploadUrl({ bucket: MANUALES_BUCKET, key, contentType, expiresIn: 300 });
  if (error || !data) return Response.json({ error: 'No se pudo preparar la subida' }, { status: 500 });

  return Response.json({ uploadUrl: data.uploadUrl, key });
}
