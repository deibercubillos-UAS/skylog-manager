// Skylog V2.0 — F3. Acciones correctivas de un caso SMS.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { caseId, description, responsibleId, dueDate } = body;
  if (!caseId || !description) return Response.json({ error: 'caseId y description son requeridos' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { data: caseRow, error: caseError } = await supabase
    .from('sms_cases')
    .select('id, organization_id')
    .eq('id', caseId)
    .maybeSingle();
  if (caseError) return Response.json({ error: 'Error verificando el caso' }, { status: 500 });
  if (!caseRow) return Response.json({ error: 'Caso no encontrado' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === caseRow.organization_id);
  if (!membership || membership.role !== 'gerente_sms') {
    return Response.json({ error: 'Solo el Gerente SMS asignado agrega acciones correctivas' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_case_actions')
    .insert({
      case_id: caseId,
      organization_id: caseRow.organization_id,
      description,
      responsible_id: responsibleId || null,
      due_date: dueDate || null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ action: data });
}

/** Marca una acción como hecha (done_at). */
export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { actionId } = body;
  if (!actionId) return Response.json({ error: 'actionId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { data: actionRow, error: actionError } = await supabase
    .from('sms_case_actions')
    .select('id, organization_id')
    .eq('id', actionId)
    .maybeSingle();
  if (actionError) return Response.json({ error: 'Error verificando la acción' }, { status: 500 });
  if (!actionRow) return Response.json({ error: 'Acción no encontrada' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === actionRow.organization_id);
  if (!membership || membership.role !== 'gerente_sms') {
    return Response.json({ error: 'Solo el Gerente SMS asignado marca acciones hechas' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_case_actions')
    .update({ done_at: new Date().toISOString() })
    .eq('id', actionId)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ action: data });
}
