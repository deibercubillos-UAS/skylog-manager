// Skylog V2.0 — Manuales: publicar una nueva versión (gestores). Actualiza
// current_* del manual; mismo criterio de v1: el acuse de lectura se ata a
// la versión, así que al publicar una nueva todos deben volver a confirmar
// (no se migra ningún manual_acknowledgments viejo).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { createNotifications } from '@/lib/v2/notify';
import { storagePut } from '@/lib/storage';

const BUCKET = 'documents';
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export async function POST(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error: fetchError } = await supabase.from('manuales').select('*').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, manual.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede publicar nuevas versiones' }, { status: 403 });
  }

  const form = await request.formData();
  const version = form.get('version');
  const effectiveDate = form.get('effectiveDate');
  const comments = form.get('comments') || '';
  const file = form.get('file');

  if (!version || typeof version !== 'string' || !version.trim()) return Response.json({ error: 'version es requerido' }, { status: 400 });
  if (!effectiveDate) return Response.json({ error: 'effectiveDate es requerido' }, { status: 400 });
  if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, Word o Excel' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 25 MB' }, { status: 413 });

  const ext = file.name?.split('.').pop() || 'pdf';
  const key = `v2-orgs/${manual.organization_id}/manuales/${manual.id}/${Date.now()}-v${version.trim()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  const { error: putError } = await storagePut({ bucket: BUCKET, key, body, contentType: file.type });
  if (putError) return Response.json({ error: 'No se pudo subir el archivo' }, { status: 500 });

  const { data: versionRow, error: versionError } = await supabase
    .from('manual_versions')
    .insert({
      manual_id: manual.id,
      organization_id: manual.organization_id,
      version: version.trim(),
      effective_date: effectiveDate,
      file_path: key,
      comments: typeof comments === 'string' ? comments.trim() : '',
      uploaded_by: personId,
    })
    .select()
    .single();
  if (versionError) return Response.json({ error: versionError.message }, { status: 500 });

  const { data: updated, error: updateError } = await supabase
    .from('manuales')
    .update({
      current_version: versionRow.version,
      current_effective_date: versionRow.effective_date,
      current_file_path: versionRow.file_path,
      current_version_id: versionRow.id,
    })
    .eq('id', manual.id)
    .select()
    .single();
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  await createNotifications({
    organizationId: manual.organization_id,
    type: 'manual_publicado',
    title: `Nueva versión de ${manual.title}`,
    body: `Versión ${version.trim()} — debes volver a confirmar tu lectura.`,
    link: '/manuales',
    actorPersonId: personId,
  });
  return Response.json({ manual: updated, version: versionRow });
}
