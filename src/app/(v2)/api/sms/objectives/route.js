// Skylog V2.0 — SMS-F: Balanced Scorecard — objetivos de seguridad
// operacional vinculados a los indicadores SPI que los miden (cierra el
// hallazgo de 17-implementacion-sms-uas.md §4: "los indicadores no son una
// lista suelta"). GET trae cada objetivo con sus indicadores + el último
// dato mensual real de cada uno (nunca se infiere si "mejoró" o "empeoró"
// — no hay un flag de sentido por indicador en el esquema, mostrarlo sería
// fabricar una lectura que el dato no respalda).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

async function syncIndicatorLinks(supabase, objectiveId, indicatorIds) {
  await supabase.from('sms_objective_indicators').delete().eq('objective_id', objectiveId);
  if (indicatorIds?.length) {
    await supabase.from('sms_objective_indicators').insert(indicatorIds.map((indicatorId) => ({ objective_id: objectiveId, indicator_id: indicatorId })));
  }
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(organizationId)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { data: objectives, error } = await supabase
    .from('sms_objectives')
    .select('*, links:sms_objective_indicators(indicator:indicator_id(id, name, is_official))')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const indicatorIds = [...new Set((objectives || []).flatMap((o) => o.links.map((l) => l.indicator?.id).filter(Boolean)))];
  let latestByIndicator = {};
  if (indicatorIds.length) {
    const { data: monthly } = await supabase
      .from('safety_indicator_monthly')
      .select('indicator_id, year, month, rate')
      .in('indicator_id', indicatorIds)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    for (const row of monthly || []) {
      if (!latestByIndicator[row.indicator_id]) latestByIndicator[row.indicator_id] = row;
    }
  }

  const withLatest = (objectives || []).map((o) => ({
    ...o,
    indicators: o.links.map((l) => ({ ...l.indicator, latest: l.indicator ? latestByIndicator[l.indicator.id] || null : null })),
    links: undefined,
  }));

  return Response.json({ objectives: withLatest });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, title, metricDescription, targetValue, targetUnit, indicatorIds } = body;
  if (!organizationId || !title?.trim()) return Response.json({ error: 'organizationId y title son requeridos' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede crear objetivos SMS' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_objectives')
    .insert({
      organization_id: organizationId,
      title: title.trim(),
      metric_description: metricDescription?.trim() || null,
      target_value: targetValue ?? null,
      target_unit: targetUnit?.trim() || null,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (Array.isArray(indicatorIds) && indicatorIds.length) {
    // Verifica que los indicadores pertenezcan a la misma org — nunca se
    // confía en los ids que manda el cliente.
    const { data: validIndicators } = await supabase.from('safety_indicators').select('id').eq('organization_id', organizationId).in('id', indicatorIds);
    await syncIndicatorLinks(supabase, data.id, (validIndicators || []).map((i) => i.id));
  }

  return Response.json({ objective: data });
}
