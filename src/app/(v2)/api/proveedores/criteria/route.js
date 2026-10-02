// Skylog V2.0 — Proveedores: catálogo de criterios de auditoría — cada
// organización arma el suyo desde cero (sin catálogo global/regulatorio,
// mismo criterio que v1: no hay una taxonomía oficial de proveedores en
// RAC 100 que forzar).
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
    return Response.json({ error: 'Solo un gestor puede ver el checklist de auditoría' }, { status: 403 });
  }

  const { data, error } = await supabase.from('supplier_audit_criteria').select('*').eq('organization_id', organizationId).order('order_index');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ criteria: data || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, criterion, category, orderIndex } = body;
  if (!organizationId || !criterion?.trim()) return Response.json({ error: 'organizationId y criterion son requeridos' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede administrar el checklist de auditoría' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('supplier_audit_criteria')
    .insert({ organization_id: organizationId, criterion: criterion.trim(), category: category?.trim() || null, order_index: orderIndex ?? 0 })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ criterion: data });
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

  const { data: existing, error: fetchError } = await supabase.from('supplier_audit_criteria').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Criterio no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede administrar el checklist de auditoría' }, { status: 403 });
  }

  const { error } = await supabase.from('supplier_audit_criteria').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
