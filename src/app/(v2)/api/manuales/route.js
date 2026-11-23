// Skylog V2.0 — Manuales de la Empresa: repositorio con versionado, réplica
// funcional de v1 (company_manuals/manual_versions/manual_acknowledgments)
// sobre el modelo organizations/people/memberships. A diferencia de
// Proveedores/Capacitación-administración, la LECTURA es para cualquier
// miembro activo de la org (igual que v1 canViewManuals) — solo
// crear/editar/versionar es de gestores (canManageManuals ≈ v2_is_duty_manager).
// Ver 35-frontend.md.
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { createNotifications } from '@/lib/v2/notify';
import { storagePut } from '@/lib/storage';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';
import {
  MANUALES_BUCKET as BUCKET,
  MANUALES_MAX_BYTES as MAX_BYTES,
  MANUALES_ALLOWED_TYPES as ALLOWED_TYPES,
  verifyUploadedManual,
} from '@/lib/v2/manualesUpload';

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(organizationId)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { data: manuales, error } = await supabase
    .from('manuales')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('category')
    .order('title');
  if (error) return dbError(error, 'manuales');

  const versionIds = (manuales || []).map((m) => m.current_version_id).filter(Boolean);
  let acknowledgedIds = new Set();
  if (personId && versionIds.length) {
    const { data: acks } = await supabase
      .from('manual_acknowledgments')
      .select('version_id')
      .eq('person_id', personId)
      .in('version_id', versionIds);
    acknowledgedIds = new Set((acks || []).map((a) => a.version_id));
  }

  const withAck = (manuales || []).map((m) => ({ ...m, acknowledged: m.current_version_id ? acknowledgedIds.has(m.current_version_id) : false }));
  return Response.json({ manuales: withAck });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  // Dos caminos: subida directa a R2 (el navegador ya subió el archivo y manda
  // sólo `key` por JSON — evita el tope de ~4.5 MB del cuerpo serverless) o
  // archivo en el cuerpo vía FormData (p. ej. el MSMS, PDFs chicos).
  const ct = request.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');

  let organizationId, title, category, categories, version, effectiveDate, comments, uploadedKey, declaredType, file;
  if (isJson) {
    let b;
    try { b = await request.json(); } catch { return Response.json({ error: 'Cuerpo inválido' }, { status: 400 }); }
    organizationId = b.organizationId;
    title = b.title;
    category = b.category;
    categories = b.categories;
    version = b.version;
    effectiveDate = b.effectiveDate;
    comments = b.comments || '';
    uploadedKey = b.key;
    declaredType = b.contentType;
  } else {
    const form = await request.formData();
    organizationId = form.get('organizationId');
    title = form.get('title');
    category = form.get('category');
    version = form.get('version');
    effectiveDate = form.get('effectiveDate');
    comments = form.get('comments') || '';
    file = form.get('file');
  }

  // Un manual puede cumplir varias categorías (40-sms / pedido del usuario). `categories` es la lista; `category`
  // (principal, primera) se conserva por compatibilidad. Valores válidos: ver manuales/_categoryMeta.js.
  const CATEGORY_VALUES = new Set(['MO', 'SMS', 'MANTENIMIENTO', 'ORGANIZACION', 'SOP', 'OTRO']);
  const catList = [...new Set((Array.isArray(categories) ? categories : category ? [category] : []).filter((c) => CATEGORY_VALUES.has(c)))];
  const primaryCategory = catList[0];

  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  if (!title || typeof title !== 'string' || !title.trim()) return Response.json({ error: 'title es requerido' }, { status: 400 });
  if (!catList.length) return Response.json({ error: 'Elige al menos una categoría' }, { status: 400 });
  if (!version || typeof version !== 'string' || !version.trim()) return Response.json({ error: 'version es requerido' }, { status: 400 });
  if (!effectiveDate) return Response.json({ error: 'effectiveDate es requerido' }, { status: 400 });
  if (isJson) {
    if (!uploadedKey || typeof uploadedKey !== 'string') return Response.json({ error: 'key es requerido' }, { status: 400 });
  } else {
    if (!file || typeof file === 'string') return Response.json({ error: 'file es requerido' }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, Word o Excel' }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 25 MB' }, { status: 413 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'AA4')) {
    return Response.json({ error: 'Solo un gestor puede cargar manuales' }, { status: 403 });
  }

  // Se crea la fila del manual primero (para tener un id al que anclar el
  // archivo); si la subida/verificación falla, se revierte — mismo patrón que v1.
  const { data: manual, error: createError } = await supabase
    .from('manuales')
    .insert({ organization_id: organizationId, title: title.trim(), category: primaryCategory, categories: catList, created_by: personId })
    .select()
    .single();
  if (createError) return Response.json({ error: createError.message }, { status: 500 });

  let key;
  if (isJson) {
    const v = await verifyUploadedManual({ key: uploadedKey, declaredContentType: declaredType });
    if (!v.ok) {
      await supabase.from('manuales').delete().eq('id', manual.id);
      return Response.json({ error: v.error }, { status: v.status });
    }
    key = uploadedKey;
  } else {
    const ext = file.name?.split('.').pop() || 'pdf';
    key = `v2-orgs/${organizationId}/manuales/${manual.id}/${Date.now()}-v${version.trim()}.${ext}`;
    const body = Buffer.from(await file.arrayBuffer());
    const { error: putError } = await storagePut({ bucket: BUCKET, key, body, contentType: file.type });
    if (putError) {
      await supabase.from('manuales').delete().eq('id', manual.id);
      return Response.json({ error: 'No se pudo subir el archivo' }, { status: 500 });
    }
  }

  const { data: versionRow, error: versionError } = await supabase
    .from('manual_versions')
    .insert({
      manual_id: manual.id,
      organization_id: organizationId,
      version: version.trim(),
      effective_date: effectiveDate,
      file_path: key,
      comments: typeof comments === 'string' ? comments.trim() : '',
      uploaded_by: personId,
    })
    .select()
    .single();
  if (versionError) {
    await supabase.from('manuales').delete().eq('id', manual.id);
    return Response.json({ error: versionError.message }, { status: 500 });
  }

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
    organizationId,
    type: 'manual_publicado',
    title: `Nuevo manual: ${title.trim()}`,
    body: 'Léelo y confirma tu lectura.',
    link: '/manuales',
    actorPersonId: personId,
  });
  await logAudit({ organizationId, action: 'create', module: 'Manuales', entityLabel: `Manual ${title.trim()}` });
  return Response.json({ manual: updated });
}
