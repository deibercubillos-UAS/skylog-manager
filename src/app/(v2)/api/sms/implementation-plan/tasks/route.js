// Skylog V2.0 — SMS-C. Filas del plan tipo Gantt — una por elemento oficial
// (upsert por `organization_id,element_key`, único por org) o tarea
// personalizada (element_key null, siempre un insert nuevo).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, phase, elementKey, label, responsiblePersonId, responsibleName, resources, startDate, endDate, manualDone, notes } = body;
  if (!organizationId || !phase || !label?.trim()) {
    return Response.json({ error: 'organizationId, phase y label son requeridos' }, { status: 400 });
  }
  if (!Number.isInteger(phase) || phase < 1 || phase > 4) return Response.json({ error: 'phase debe ser 1-4' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede editar el plan de implementación' }, { status: 403 });
  }

  if (responsiblePersonId) {
    const { data: candidateMembership, error: candidateError } = await supabase
      .from('memberships')
      .select('id')
      .eq('person_id', responsiblePersonId)
      .eq('organization_id', organizationId)
      .eq('status', 'activa')
      .maybeSingle();
    if (candidateError) return Response.json({ error: 'Error verificando al responsable' }, { status: 500 });
    if (!candidateMembership) return Response.json({ error: 'El responsable no tiene membresía activa en esta organización' }, { status: 404 });
  }

  const row = {
    organization_id: organizationId,
    phase,
    element_key: elementKey || null,
    label: label.trim(),
    responsible_person_id: responsiblePersonId || null,
    responsible_name: responsibleName?.trim() || null,
    resources: resources?.trim() || null,
    start_date: startDate || null,
    end_date: endDate || null,
    manual_done: !!manualDone,
    notes: notes?.trim() || null,
    created_by: personId,
    updated_at: new Date().toISOString(),
  };

  const query = elementKey
    ? supabase.from('sms_implementation_tasks').upsert(row, { onConflict: 'organization_id,element_key' })
    : supabase.from('sms_implementation_tasks').insert(row);

  const { data, error } = await query.select('*, responsible:responsible_person_id(full_name)').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ task: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, responsiblePersonId, responsibleName, resources, startDate, endDate, manualDone, notes, label } = body;
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('sms_implementation_tasks').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar el plan de implementación' }, { status: 403 });
  }

  const patch = { updated_at: new Date().toISOString() };
  if (label != null) patch.label = label.trim();
  if (responsiblePersonId !== undefined) patch.responsible_person_id = responsiblePersonId || null;
  if (responsibleName !== undefined) patch.responsible_name = responsibleName?.trim() || null;
  if (resources !== undefined) patch.resources = resources?.trim() || null;
  if (startDate !== undefined) patch.start_date = startDate || null;
  if (endDate !== undefined) patch.end_date = endDate || null;
  if (manualDone != null) patch.manual_done = !!manualDone;
  if (notes !== undefined) patch.notes = notes?.trim() || null;

  const { data, error } = await supabase.from('sms_implementation_tasks').update(patch).eq('id', id).select('*, responsible:responsible_person_id(full_name)').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ task: data });
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

  const { data: existing, error: fetchError } = await supabase.from('sms_implementation_tasks').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Tarea no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar el plan de implementación' }, { status: 403 });
  }

  const { error } = await supabase.from('sms_implementation_tasks').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
