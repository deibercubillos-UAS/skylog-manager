// Skylog V2.0 — Flota & Equipo, Fase 4b. Registrar un evento de
// mantenimiento — clase ④ evento (30-entidades.md §4), inmutable, solo
// INSERT. `performed_at_aircraft_hours` se resuelve server-side desde
// `aircraft.total_hours` — nunca se acepta del cliente (regla S2, mismo
// criterio que `installed_at_aircraft_hours` en Componentes, Fase 2).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const EVENT_TYPES = ['programado', 'correctivo', 'menor'];

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const aircraftId = searchParams.get('aircraftId');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  let query = supabase
    .from('maintenance_events')
    .select('*, aircraft:aircraft_id(serial_number, model:model_id(brand, model)), task:task_id(name), performer:performed_by(full_name)')
    .eq('organization_id', organizationId)
    .order('performed_at', { ascending: false });
  if (aircraftId) query = query.eq('aircraft_id', aircraftId);

  const { data: events, error } = await query;
  if (error) return Response.json({ error: 'Error consultando eventos de mantenimiento' }, { status: 500 });

  return Response.json({ events, isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, aircraftId, taskId, type, performedAt, findings, returnToService } = body;
  if (!organizationId || !aircraftId || !type) {
    return Response.json({ error: 'organizationId, aircraftId y type son requeridos' }, { status: 400 });
  }
  if (!EVENT_TYPES.includes(type)) {
    return Response.json({ error: 'type debe ser uno de: ' + EVENT_TYPES.join(', ') }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar mantenimiento' }, { status: 403 });
  }

  const { data: aircraft, error: aircraftError } = await supabase
    .from('aircraft')
    .select('id, total_hours')
    .eq('id', aircraftId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (aircraftError) return Response.json({ error: 'Error verificando la aeronave' }, { status: 500 });
  if (!aircraft) return Response.json({ error: 'La aeronave no pertenece a esta organización' }, { status: 400 });

  if (taskId) {
    const { data: task, error: taskError } = await supabase.from('maintenance_tasks').select('id').eq('id', taskId).eq('organization_id', organizationId).maybeSingle();
    if (taskError) return Response.json({ error: 'Error verificando la tarea' }, { status: 500 });
    if (!task) return Response.json({ error: 'La tarea no pertenece a esta organización' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('maintenance_events')
    .insert({
      organization_id: organizationId,
      aircraft_id: aircraftId,
      task_id: taskId || null,
      type,
      performed_at: performedAt || new Date().toISOString(),
      performed_at_aircraft_hours: aircraft.total_hours,
      performed_by: personId,
      findings: findings || null,
      return_to_service: returnToService !== false,
    })
    .select('*, aircraft:aircraft_id(serial_number, model:model_id(brand, model)), task:task_id(name), performer:performed_by(full_name)')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // `operational_status` (Fase 1, hasta ahora solo manual) se sincroniza
  // con el evento real: sin retorno al servicio, la aeronave queda en
  // mantenimiento; con retorno, vuelve a disponible.
  await supabase
    .from('aircraft')
    .update({ operational_status: returnToService === false ? 'en_mantenimiento' : 'disponible' })
    .eq('id', aircraftId);

  return Response.json({ event: data });
}
