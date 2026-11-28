// Skylog V2.0 — SMS Matriz de peligros: ver (URL firmada) y eliminar un adjunto
// de un avance de control. Ver: P1; eliminar: gestor SMS (P2). El path privado
// nunca se expone; la descarga redirige a una URL firmada de 1 h.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView, membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { storageSignedUrl, storageRemove } from '@/lib/storage';
import { dbError } from '@/lib/v2/apiErrors';

const BUCKET = 'documents';

async function load(supabase, attachmentId, user) {
  const { data: att, error: fetchError } = await supabase
    .from('hazard_control_update_attachments')
    .select('id, organization_id, storage_path')
    .eq('id', attachmentId)
    .maybeSingle();
  if (fetchError) return { error: Response.json({ error: 'Error consultando el adjunto' }, { status: 500 }) };
  if (!att) return { error: Response.json({ error: 'Adjunto no encontrado' }, { status: 404 }) };
  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { att, memberships };
}

export async function GET(request, { params }) {
  const { attachmentId } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const loaded = await load(supabase, attachmentId, user);
  if (loaded.error) return loaded.error;
  if (!membershipsCanView(loaded.memberships, loaded.att.organization_id, 'P1')) {
    return Response.json({ error: 'No tienes permiso para ver este adjunto' }, { status: 403 });
  }
  const { data, error } = await storageSignedUrl({ bucket: BUCKET, key: loaded.att.storage_path, expiresIn: 3600 });
  if (error) return Response.json({ error: 'No se pudo generar el enlace del adjunto' }, { status: 500 });
  return Response.redirect(data.signedUrl, 302);
}

export async function DELETE(request, { params }) {
  const { attachmentId } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const loaded = await load(supabase, attachmentId, user);
  if (loaded.error) return loaded.error;
  if (!membershipsCanEdit(loaded.memberships, loaded.att.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede eliminar adjuntos' }, { status: 403 });
  }
  const { error } = await supabase.from('hazard_control_update_attachments').delete().eq('id', attachmentId).eq('organization_id', loaded.att.organization_id);
  if (error) return dbError(error, 'sms/control-updates/attachments');
  await storageRemove({ bucket: BUCKET, keys: [loaded.att.storage_path] }).catch(() => {});
  return Response.json({ ok: true });
}
