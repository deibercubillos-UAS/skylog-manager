// Skylog V2.0 — Reportes: Mantenimiento (eventos de mantenimiento +
// eventos inesperados). Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

function aircraftLabel(a) {
  if (!a) return '—';
  return [a.serial_number, a.model && `${a.model.brand} ${a.model.model}`].filter(Boolean).join(' — ');
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const aircraftId = searchParams.get('aircraftId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let eventsQuery = supabase
    .from('maintenance_events')
    .select('id, performed_at, performed_at_aircraft_hours, type, findings, return_to_service, aircraft:aircraft_id(serial_number, model:model_id(brand, model))')
    .eq('organization_id', organizationId)
    .order('performed_at', { ascending: false });
  if (from) eventsQuery = eventsQuery.gte('performed_at', from);
  if (to) eventsQuery = eventsQuery.lte('performed_at', `${to}T23:59:59`);
  if (aircraftId) eventsQuery = eventsQuery.eq('aircraft_id', aircraftId);

  let unexpectedQuery = supabase
    .from('unexpected_events')
    .select('id, reported_at, type, description, evaluated, evaluation_result, aircraft:aircraft_id(serial_number, model:model_id(brand, model))')
    .eq('organization_id', organizationId)
    .order('reported_at', { ascending: false });
  if (from) unexpectedQuery = unexpectedQuery.gte('reported_at', from);
  if (to) unexpectedQuery = unexpectedQuery.lte('reported_at', `${to}T23:59:59`);
  if (aircraftId) unexpectedQuery = unexpectedQuery.eq('aircraft_id', aircraftId);

  // Programa de mantenimiento configurado por modelo (100.535(3)) — snapshot de la
  // configuración vigente, no un evento con fecha, así que no se filtra por from/to.
  const programsQuery = supabase
    .from('maintenance_tasks')
    .select('name, system_category, interval_cycles, interval_hours, interval_calendar_days, tolerance_value, tolerance_unit, program:program_id(model:model_id(brand, model))')
    .eq('organization_id', organizationId)
    .order('system_category');

  const [{ data: eventsData, error: eventsError }, { data: unexpectedData, error: unexpectedError }, { data: programsData, error: programsError }] = await Promise.all([
    eventsQuery,
    unexpectedQuery,
    programsQuery,
  ]);
  if (eventsError) return Response.json({ error: eventsError.message }, { status: 500 });
  if (unexpectedError) return Response.json({ error: unexpectedError.message }, { status: 500 });
  if (programsError) return Response.json({ error: programsError.message }, { status: 500 });

  return Response.json({
    events: (eventsData || []).map((e) => ({ ...e, aircraft_label: aircraftLabel(e.aircraft) })),
    unexpected: (unexpectedData || []).map((u) => ({ ...u, aircraft_label: aircraftLabel(u.aircraft) })),
    programs: (programsData || []).map((t) => ({ ...t, model_label: t.program?.model ? `${t.program.model.brand} ${t.program.model.model}` : '—' })),
  });
}
