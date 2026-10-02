// Skylog V2.0 — Proveedores: CRUD del listado de proveedores. Todo el
// módulo es solo para gestores, incluso lectura (mismo criterio real de
// v1: sin nivel de acceso para piloto) — RLS ya lo exige, pero se valida
// también en la API (regla del proyecto: gate de rol en la API, no solo
// en la UI/RLS).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede ver Proveedores' }, { status: 403 });
  }

  const { data, error } = await supabase.from('suppliers').select('*').eq('organization_id', organizationId).order('name');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ suppliers: data || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, name, category, nit, contact, notes, isActive } = body;
  if (!organizationId || !name?.trim()) return Response.json({ error: 'organizationId y name son requeridos' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede crear proveedores' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      category: category?.trim() || null,
      nit: nit?.trim() || null,
      contact: contact?.trim() || null,
      notes: notes?.trim() || null,
      is_active: isActive ?? true,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ supplier: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, name, category, nit, contact, notes, isActive } = body;
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('suppliers').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Proveedor no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar proveedores' }, { status: 403 });
  }

  const patch = {};
  if (name != null) patch.name = name.trim();
  if (category !== undefined) patch.category = category?.trim() || null;
  if (nit !== undefined) patch.nit = nit?.trim() || null;
  if (contact !== undefined) patch.contact = contact?.trim() || null;
  if (notes !== undefined) patch.notes = notes?.trim() || null;
  if (isActive != null) patch.is_active = isActive;

  const { data, error } = await supabase.from('suppliers').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ supplier: data });
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

  const { data: existing, error: fetchError } = await supabase.from('suppliers').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Proveedor no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar proveedores' }, { status: 403 });
  }

  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
