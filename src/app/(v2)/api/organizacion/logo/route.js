// Skylog V2.0 — Organización. Subida del logo de la empresa — se muestra en
// la esquina superior izquierda del sidebar. Reutiliza la capa de storage
// (R2) tal cual — es infraestructura pura, sin dependencia de v1 — pero NO
// reutiliza `/api/storage/upload` (v1): ese endpoint valida con
// `getOrgContext()`, que consulta `profiles`, tabla que no existe en esta
// rama. Aquí el guard es el mismo patrón ya usado en el resto de V2
// (resolveCurrentPerson + isDutyManager), y sube al bucket público
// `partner-logos` ya existente, bajo un prefijo propio (`v2-orgs/`) para no
// chocar con las llaves de logos de socios de v1.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { storagePut, storagePublicUrl } from '@/lib/storage';

const BUCKET = 'partner-logos';
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const form = await request.formData();
  const organizationId = form.get('organizationId');
  const file = form.get('file');
  if (!organizationId || !file || typeof file === 'string') {
    return Response.json({ error: 'organizationId y file son requeridos' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: 'Formato no soportado — usa PNG, JPEG, WEBP o SVG' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'El archivo supera el límite de 2 MB' }, { status: 413 });
  }

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede cambiar el logo de la organización' }, { status: 403 });
  }

  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1];
  const key = `v2-orgs/${organizationId}/logo-${Date.now()}.${ext}`;

  const body = Buffer.from(await file.arrayBuffer());
  const { error: putError } = await storagePut({ bucket: BUCKET, key, body, contentType: file.type });
  if (putError) return Response.json({ error: 'No se pudo subir el logo' }, { status: 500 });

  const { publicUrl } = storagePublicUrl({ bucket: BUCKET, key }).data;

  const admin = createAdminClient();
  const { data, error } = await admin.from('organizations').update({ logo_url: publicUrl }).eq('id', organizationId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ organization: data });
}
