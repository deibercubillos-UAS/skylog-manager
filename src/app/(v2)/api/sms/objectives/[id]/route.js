// Skylog V2.0 — SMS-F: editar/archivar un objetivo SMS, resincroniza sus
// indicadores vinculados cuando `indicatorIds` viene en el body.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: objective, error: fetchError } = await supabase.from('sms_objectives').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!objective) return Response.json({ error: 'Objetivo no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, objective.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar objetivos SMS' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, metricDescription, targetValue, targetUnit, status, indicatorIds } = body;
  const patch = { updated_at: new Date().toISOString() };
  if (title != null) patch.title = title.trim();
  if (metricDescription !== undefined) patch.metric_description = metricDescription?.trim() || null;
  if (targetValue !== undefined) patch.target_value = targetValue;
  if (targetUnit !== undefined) patch.target_unit = targetUnit?.trim() || null;
  if (status != null) {
    if (!['activo', 'archivado'].includes(status)) return Response.json({ error: 'status inválido' }, { status: 400 });
    patch.status = status;
  }

  const { data, error } = await supabase.from('sms_objectives').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (Array.isArray(indicatorIds)) {
    const { data: validIndicators } = await supabase.from('safety_indicators').select('id').eq('organization_id', objective.organization_id).in('id', indicatorIds);
    await supabase.from('sms_objective_indicators').delete().eq('objective_id', id);
    if (validIndicators?.length) {
      await supabase.from('sms_objective_indicators').insert(validIndicators.map((i) => ({ objective_id: id, indicator_id: i.id })));
    }
  }

  return Response.json({ objective: data });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: objective, error: fetchError } = await supabase.from('sms_objectives').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!objective) return Response.json({ error: 'Objetivo no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, objective.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar objetivos SMS' }, { status: 403 });
  }

  const { error } = await supabase.from('sms_objectives').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
