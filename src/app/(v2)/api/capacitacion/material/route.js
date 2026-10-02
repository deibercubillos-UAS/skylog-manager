// Skylog V2.0 — Capacitación: material de apoyo de una evaluación puntual
// (`capacitacion_evaluations.material_*`) — cada evaluación tiene el suyo,
// a diferencia del modelo anterior (decisión 121) donde el material era un
// campo del examen único por pista. Mismo patrón de bucket que el
// documento de propiedad de aeronave: privado `documents`, prefijo
// `v2-orgs/`, GET redirige a una URL firmada.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { storagePut, storageSignedUrl, storageRemove } from '@/lib/storage';

const BUCKET = 'documents';
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

async function loadEvaluation(supabase, evaluationId) {
  return supabase.from('capacitacion_evaluations').select('id, organization_id, material_path').eq('id', evaluationId).maybeSingle();
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const form = await request.formData();
  const evaluationId = form.get('evaluationId');
  const title = form.get('title');
  const description = form.get('description') || '';
  const file = form.get('file');

  if (!evaluationId) return Response.json({ error: 'evaluationId es requerido' }, { status: 400 });
  if (!title || typeof title !== 'string' || !title.trim()) return Response.json({ error: 'title es requerido' }, { status: 400 });

  const { data: evaluation, error: evalError } = await loadEvaluation(supabase, evaluationId);
  if (evalError) return Response.json({ error: evalError.message }, { status: 500 });
  if (!evaluation) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, evaluation.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede administrar el material de apoyo' }, { status: 403 });
  }

  let materialPath = evaluation.material_path || null;

  if (file && typeof file !== 'string') {
    if (!ALLOWED_TYPES.has(file.type)) return Response.json({ error: 'Formato no soportado — usa PDF, PNG, JPEG o WEBP' }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera el límite de 15 MB' }, { status: 413 });

    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
    const key = `v2-orgs/${evaluation.organization_id}/capacitacion/${evaluationId}/material-${Date.now()}.${ext}`;
    const body = Buffer.from(await file.arrayBuffer());
    const { error: putError } = await storagePut({ bucket: BUCKET, key, body, contentType: file.type });
    if (putError) return Response.json({ error: 'No se pudo subir el archivo' }, { status: 500 });

    if (evaluation.material_path) await storageRemove({ bucket: BUCKET, keys: [evaluation.material_path] }).catch(() => {});
    materialPath = key;
  }

  const { data, error } = await supabase
    .from('capacitacion_evaluations')
    .update({
      material_title: title.trim(),
      material_description: typeof description === 'string' ? description.trim() : '',
      material_path: materialPath,
      material_uploaded_at: new Date().toISOString(),
    })
    .eq('id', evaluationId)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ evaluation: data });
}

export async function DELETE(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const evaluationId = searchParams.get('evaluationId');
  if (!evaluationId) return Response.json({ error: 'evaluationId es requerido' }, { status: 400 });

  const { data: evaluation, error: evalError } = await loadEvaluation(supabase, evaluationId);
  if (evalError) return Response.json({ error: evalError.message }, { status: 500 });
  if (!evaluation) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, evaluation.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede administrar el material de apoyo' }, { status: 403 });
  }

  if (evaluation.material_path) await storageRemove({ bucket: BUCKET, keys: [evaluation.material_path] }).catch(() => {});

  const { data, error } = await supabase
    .from('capacitacion_evaluations')
    .update({ material_title: null, material_description: null, material_path: null, material_uploaded_at: null })
    .eq('id', evaluationId)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ evaluation: data });
}

// GET — sirve el archivo vía redirect a una URL firmada. Cualquier miembro
// activo de la organización puede descargarlo, no solo gestores.
export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const evaluationId = searchParams.get('evaluationId');
  if (!evaluationId) return Response.json({ error: 'evaluationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { data: evaluation, error } = await loadEvaluation(supabase, evaluationId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!evaluation) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });
  if (!evaluation.material_path) return Response.json({ error: 'Esta evaluación no tiene material de apoyo cargado' }, { status: 404 });

  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!orgIds.includes(evaluation.organization_id)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { data: signed, error: signError } = await storageSignedUrl({ bucket: BUCKET, key: evaluation.material_path, expiresIn: 3600 });
  if (signError) return Response.json({ error: 'No se pudo generar el enlace del material' }, { status: 500 });

  return Response.redirect(signed.signedUrl, 302);
}
