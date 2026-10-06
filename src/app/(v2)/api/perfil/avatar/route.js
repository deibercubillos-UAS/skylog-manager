// Skylog V2.0 — foto de perfil de la propia persona. Solo ella la cambia. Va en el bucket privado `documents`
// (`people` no tiene política de UPDATE: se escribe con service role tras verificar que es la propia persona)
// y se muestra por esta misma ruta (URL firmada de 1 h): la ruta del archivo no sale del servidor.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { storageProblem, adminKeyProblem } from '@/lib/v2/adminKey';
import { storagePut, storageSignedUrl, storageRemove } from '@/lib/storage';
import { DOCUMENT_MAX_BYTES } from '@/lib/v2/rowDocument';

const BUCKET = 'documents';
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function me() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId } = await resolveCurrentPerson(supabase, user.id);
  if (error || !personId) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, personId };
}

export async function GET(request) {
  const m = await me();
  if (m.error) return m.error;
  const target = new URL(request.url).searchParams.get('personId') || m.personId;
  // La RLS de `people` deja ver a los compañeros de organización: así la foto aparece en listados.
  const { data: row } = await m.supabase.from('people').select('avatar_path').eq('id', target).maybeSingle();
  if (!row?.avatar_path) return Response.json({ error: 'Sin foto' }, { status: 404 });
  const { data, error } = await storageSignedUrl({ bucket: BUCKET, key: row.avatar_path, expiresIn: 3600 });
  if (error) return Response.json({ error: 'No se pudo generar el enlace' }, { status: 500 });
  return Response.redirect(data.signedUrl, 302);
}

export async function POST(request) {
  const issue = adminKeyProblem() || storageProblem();
  if (issue) return Response.json({ error: issue, setup: true }, { status: 503 });
  const m = await me();
  if (m.error) return m.error;
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
  if (!ALLOWED.has(file.type)) return Response.json({ error: 'La foto debe ser PNG, JPEG o WEBP' }, { status: 400 });
  if (file.size > DOCUMENT_MAX_BYTES) return Response.json({ error: 'La foto supera el límite de 4 MB' }, { status: 413 });

  const { data: prev } = await m.supabase.from('people').select('avatar_path').eq('id', m.personId).maybeSingle();
  const key = `v2-people/${m.personId}/avatar-${Date.now()}.${file.type.split('/')[1]}`;
  const { error: putError } = await storagePut({ bucket: BUCKET, key, body: Buffer.from(await file.arrayBuffer()), contentType: file.type });
  if (putError) return Response.json({ error: 'No se pudo subir la foto' }, { status: 500 });
  const { error } = await createAdminClient().from('people').update({ avatar_path: key }).eq('id', m.personId);
  if (error) {
    await storageRemove({ bucket: BUCKET, keys: [key] });
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (prev?.avatar_path) await storageRemove({ bucket: BUCKET, keys: [prev.avatar_path] });
  return Response.json({ ok: true });
}

export async function DELETE() {
  const m = await me();
  if (m.error) return m.error;
  const { data: prev } = await m.supabase.from('people').select('avatar_path').eq('id', m.personId).maybeSingle();
  const { error } = await createAdminClient().from('people').update({ avatar_path: null }).eq('id', m.personId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (prev?.avatar_path) await storageRemove({ bucket: BUCKET, keys: [prev.avatar_path] });
  return Response.json({ ok: true });
}
