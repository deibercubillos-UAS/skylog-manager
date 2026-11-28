// Skylog V2.0 — SMS Matriz de peligros: adjuntos de un avance de control.
// Varios archivos tipados por avance (foto / documento-presentación / lista de
// asistencia), en el bucket privado `documents` (path nunca expuesto). Ver:
// cualquiera que vea la matriz (P1). Subir: gestor SMS (P2). Descargar/eliminar
// cada adjunto: ruta hermana `attachments/[attachmentId]`.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView, membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { storageProblem } from '@/lib/v2/adminKey';
import { storagePut, storageRemove } from '@/lib/storage';
import { dbError } from '@/lib/v2/apiErrors';

const BUCKET = 'documents';
const MAX_BYTES = 4 * 1024 * 1024; // el cuerpo de una función de Vercel se corta en ~4,5 MB

// Tipos permitidos por categoría de adjunto.
const IMAGE = ['image/png', 'image/jpeg', 'image/webp'];
const PRESENTATION = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const ALLOWED = {
  foto: IMAGE,
  documento: ['application/pdf', ...PRESENTATION],
  lista_asistencia: ['application/pdf', ...IMAGE],
};
const EXT = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};

async function loadUpdate(supabase, id, user) {
  const { data: update, error: fetchError } = await supabase.from('hazard_control_updates').select('id, organization_id').eq('id', id).maybeSingle();
  if (fetchError) return { error: Response.json({ error: 'Error consultando el avance' }, { status: 500 }) };
  if (!update) return { error: Response.json({ error: 'Avance no encontrado' }, { status: 404 }) };
  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { update, memberships, personId };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const loaded = await loadUpdate(supabase, id, user);
  if (loaded.error) return loaded.error;
  if (!membershipsCanView(loaded.memberships, loaded.update.organization_id, 'P1')) {
    return Response.json({ error: 'No tienes permiso para ver estos adjuntos' }, { status: 403 });
  }
  const { data, error } = await supabase
    .from('hazard_control_update_attachments')
    .select('id, kind, file_name, content_type, created_at')
    .eq('update_id', id)
    .order('created_at', { ascending: true });
  if (error) return dbError(error, 'sms/control-updates/attachments');
  return Response.json({ attachments: data || [] });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const storageIssue = storageProblem();
  if (storageIssue) return Response.json({ error: storageIssue, setup: true }, { status: 503 });
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const loaded = await loadUpdate(supabase, id, user);
  if (loaded.error) return loaded.error;
  const { update, memberships, personId } = loaded;
  if (!membershipsCanEdit(memberships, update.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede adjuntar evidencias' }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const kind = String(form?.get('kind') || '');
  if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
  if (!ALLOWED[kind]) return Response.json({ error: 'Tipo de adjunto inválido' }, { status: 400 });
  if (!ALLOWED[kind].includes(file.type)) {
    return Response.json({ error: kind === 'foto' ? 'Usa una imagen (PNG, JPEG o WEBP)' : 'Formato no soportado para este adjunto' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 4 MB' }, { status: 413 });

  const ext = EXT[file.type] || 'bin';
  const key = `v2-orgs/${update.organization_id}/peligros-evidencias/${id}/${kind}-${Date.now()}.${ext}`;
  const { error: putError } = await storagePut({ bucket: BUCKET, key, body: Buffer.from(await file.arrayBuffer()), contentType: file.type });
  if (putError) return Response.json({ error: 'No se pudo subir el adjunto' }, { status: 500 });

  const { data, error } = await supabase
    .from('hazard_control_update_attachments')
    .insert({
      organization_id: update.organization_id,
      update_id: id,
      kind,
      storage_path: key,
      file_name: typeof file.name === 'string' ? file.name.slice(0, 200) : null,
      content_type: file.type,
      created_by: personId || null,
    })
    .select('id, kind, file_name, content_type, created_at')
    .single();
  if (error) {
    await storageRemove({ bucket: BUCKET, keys: [key] });
    return dbError(error, 'sms/control-updates/attachments');
  }
  return Response.json({ attachment: data });
}
