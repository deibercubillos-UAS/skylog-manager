// Skylog V2.0 — SMS Matriz de peligros: editar (estado, responsable, etc.) o
// eliminar un control. Solo gestor SMS (P2). Campos explícitos.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

const CONTROL_TYPES = ['preventivo', 'mitigador', 'recuperacion'];
const STATUSES = ['pendiente', 'en_progreso', 'implementado', 'verificado'];

async function loadOwned(supabase, id) {
  const { data: existing, error } = await supabase.from('hazard_controls').select('id, organization_id').eq('id', id).maybeSingle();
  if (error) return { error: Response.json({ error: 'Error consultando el control' }, { status: 500 }) };
  if (!existing) return { error: Response.json({ error: 'Control no encontrado' }, { status: 404 }) };
  return { existing };
}

export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const loaded = await loadOwned(supabase, id);
  if (loaded.error) return loaded.error;

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, loaded.existing.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede editar controles' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const patch = { updated_at: new Date().toISOString() };
  if (typeof body.description === 'string' && body.description.trim()) patch.description = body.description.trim().slice(0, 1000);
  if (body.controlType !== undefined) {
    if (body.controlType && !CONTROL_TYPES.includes(body.controlType)) return Response.json({ error: 'controlType inválido' }, { status: 400 });
    patch.control_type = body.controlType || null;
  }
  if (body.responsible !== undefined) patch.responsible = typeof body.responsible === 'string' && body.responsible.trim() ? body.responsible.trim().slice(0, 200) : null;
  if (body.dueDate !== undefined) patch.due_date = body.dueDate || null;
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) return Response.json({ error: 'status inválido' }, { status: 400 });
    patch.status = body.status;
  }

  const { data, error } = await supabase
    .from('hazard_controls')
    .update(patch)
    .eq('id', id)
    .select('*, updates:hazard_control_updates(id, note, progress_pct, evidence_path, created_at)')
    .single();
  if (error) return dbError(error, 'sms/hazard-controls');
  const control = {
    ...data,
    updates: (data.updates || [])
      .map((u) => ({ id: u.id, note: u.note, progress_pct: u.progress_pct, created_at: u.created_at, has_evidence: Boolean(u.evidence_path) }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  };
  return Response.json({ control });
}

export async function DELETE(request, { params }) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const loaded = await loadOwned(supabase, id);
  if (loaded.error) return loaded.error;

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, loaded.existing.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede eliminar controles' }, { status: 403 });
  }

  const { error } = await supabase.from('hazard_controls').delete().eq('id', id);
  if (error) return dbError(error, 'sms/hazard-controls');
  return Response.json({ ok: true });
}
