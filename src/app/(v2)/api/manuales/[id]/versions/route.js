// Skylog V2.0 — Manuales: publicar una nueva versión (gestores). Actualiza
// current_* del manual; mismo criterio de v1: el acuse de lectura se ata a
// la versión, así que al publicar una nueva todos deben volver a confirmar
// (no se migra ningún manual_acknowledgments viejo).
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { createNotifications } from '@/lib/v2/notify';
import { storagePut } from '@/lib/storage';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import {
  MANUALES_BUCKET as BUCKET,
  MANUALES_MAX_BYTES as MAX_BYTES,
  MANUALES_ALLOWED_TYPES as ALLOWED_TYPES,
  verifyUploadedManual,
} from '@/lib/v2/manualesUpload';

export async function POST(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error: fetchError } = await supabase.from('manuales').select('*').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, manual.organization_id, 'AA5')) {
    return Response.json({ error: 'Solo un gestor puede publicar nuevas versiones' }, { status: 403 });
  }

  // Dos caminos: subida directa a R2 (JSON con `key`, evita el tope de ~4.5 MB
  // del cuerpo serverless) o archivo en el cuerpo vía FormData (p. ej. el MSMS).
  const ct = request.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');

  let version, effectiveDate, comments, uploadedKey, declaredType, file;
  if (isJson) {
    let b;
    try { b = await request.json(); } catch { return Response.json({ error: 'Cuerpo inválido' }, { status: 400 }); }
    version = b.version;
    effectiveDate = b.effectiveDate;
    comments = b.comments || '';
    uploadedKey = b.key;
    declaredType = b.contentType;
  } else {
    const form = await request.formData();
    version = form.get('version');
    effectiveDate = form.get('effectiveDate');
    comments = form.get('comments') || '';
    file = form.get('file');
  }

  if (!version || typeof version !== 'string' || !version.trim()) return Response.json({ error: 'version es requerido' }, { status: 400 });
  if (!effectiveDate) return Response.json({ error: 'effectiveDate es requerido' }, { status: 400 });
  if (isJson) {
    if (!uploadedKey || typeof uploadedKey !== 'string') return Response.json({ error: 'key es requerido' }, { status: 400 });
  } else {
    if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, Word o Excel' }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 25 MB' }, { status: 413 });
  }

  let key;
  if (isJson) {
    const v = await verifyUploadedManual({ key: uploadedKey, declaredContentType: declaredType });
    if (!v.ok) return Response.json({ error: v.error }, { status: v.status });
    key = uploadedKey;
  } else {
    const ext = file.name?.split('.').pop() || 'pdf';
    key = `v2-orgs/${manual.organization_id}/manuales/${manual.id}/${Date.now()}-v${version.trim()}.${ext}`;
    const body = Buffer.from(await file.arrayBuffer());
    const { error: putError } = await storagePut({ bucket: BUCKET, key, body, contentType: file.type });
    if (putError) return Response.json({ error: 'No se pudo subir el archivo' }, { status: 500 });
  }

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
  await logAudit({ organizationId: manual.organization_id, action: 'update', module: 'Manuales', entityLabel: `${manual.title} — versión ${version.trim()}` });
  return Response.json({ manual: updated, version: versionRow });
}
