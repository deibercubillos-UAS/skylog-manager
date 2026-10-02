// Skylog V2.0 — Manuales: detalle + historial de versiones (GET, cualquier
// miembro activo de la org), edición de metadatos y borrado (gestores).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { storageRemove } from '@/lib/storage';

const BUCKET = 'documents';
const CATEGORIES = new Set(['MO', 'SMS', 'MANTENIMIENTO', 'ORGANIZACION', 'SOP', 'OTRO']);

async function loadManual(supabase, id) {
  return supabase.from('manuales').select('*').eq('id', id).maybeSingle();
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error } = await loadManual(supabase, id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(manual.organization_id)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { data: versions, error: versionsError } = await supabase
    .from('manual_versions')
    .select('*')
    .eq('manual_id', id)
    .order('created_at', { ascending: false });
  if (versionsError) return Response.json({ error: versionsError.message }, { status: 500 });

  return Response.json({ manual, versions: versions || [] });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error: fetchError } = await loadManual(supabase, id);
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, manual.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar manuales' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, category, status } = body;
  const patch = {};
  if (title != null) patch.title = String(title).trim();
  if (category != null) {
    if (!CATEGORIES.has(category)) return Response.json({ error: 'category inválida' }, { status: 400 });
    patch.category = category;
  }
  if (status != null) {
    if (!['active', 'archived'].includes(status)) return Response.json({ error: 'status inválido' }, { status: 400 });
    patch.status = status;
  }

  const { data, error } = await supabase.from('manuales').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ manual: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error: fetchError } = await loadManual(supabase, id);
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, manual.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar manuales' }, { status: 403 });
  }

  const { data: versions } = await supabase.from('manual_versions').select('file_path').eq('manual_id', id);
  const paths = (versions || []).map((v) => v.file_path).filter(Boolean);
  if (paths.length) await storageRemove({ bucket: BUCKET, keys: paths }).catch(() => {});

  const { error } = await supabase.from('manuales').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
