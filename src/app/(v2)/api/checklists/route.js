// Skylog V2.0 — Listas de Chequeo: CRUD de la biblioteca libre de
// checklists/procedimientos. Cualquier miembro activo lee (RLS lo permite),
// solo un gestor crea/edita/borra.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const CATEGORIES = ['Prevuelo', 'Reportes', 'Seguridad Operacional', 'Mantenimiento'];

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { data, error } = await supabase.from('checklists').select('*').eq('organization_id', organizationId).order('category').order('name');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ checklists: data || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, name, category, description, icon, steps, version } = body;
  if (!organizationId || !name?.trim() || !category) return Response.json({ error: 'organizationId, name y category son requeridos' }, { status: 400 });
  if (!CATEGORIES.includes(category)) return Response.json({ error: 'category inválida' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede crear listas de chequeo' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('checklists')
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      category,
      description: description?.trim() || null,
      icon: icon?.trim() || null,
      steps: Array.isArray(steps) ? steps.filter((s) => s?.trim()) : [],
      version: version?.trim() || '1.0',
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ checklist: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, name, category, description, icon, steps, version } = body;
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });
  if (category != null && !CATEGORIES.includes(category)) return Response.json({ error: 'category inválida' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('checklists').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Lista de chequeo no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar listas de chequeo' }, { status: 403 });
  }

  const patch = { updated_at: new Date().toISOString() };
  if (name != null) patch.name = name.trim();
  if (category != null) patch.category = category;
  if (description !== undefined) patch.description = description?.trim() || null;
  if (icon !== undefined) patch.icon = icon?.trim() || null;
  if (steps != null) patch.steps = Array.isArray(steps) ? steps.filter((s) => s?.trim()) : [];
  if (version != null) patch.version = version.trim() || '1.0';

  const { data, error } = await supabase.from('checklists').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ checklist: data });
}

export async function DELETE(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('checklists').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Lista de chequeo no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar listas de chequeo' }, { status: 403 });
  }

  const { error } = await supabase.from('checklists').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
