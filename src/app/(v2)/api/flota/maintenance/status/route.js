// Skylog V2.0 — Flota & Equipo, Fase 4b. Vencimiento por aeronave — cruza
// el programa de la Fase 4a (qué hay que hacer, cada cuánto) con los
// eventos reales de Fase 4b (cuándo se hizo por última vez) para responder
// "a quién le toca ya". Se calcula EN VIVO, sin persistir un estado
// derivado que pudiera desincronizarse (mismo criterio que el resto del
// proyecto: nunca read-calculate-write cacheado).
//
// Límite real, declarado explícitamente en la respuesta (regla V1/S1 — si
// un dato no existe, la interfaz no lo inventa): una tarea con SOLO
// intervalo por ciclos queda `sinDato` — V2 no lleva todavía un contador de
// ciclos/vuelos por aeronave (solo horas totales), así que no hay con qué
// evaluarla. Horas y días calendario sí se evalúan siempre que el dato exista.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

function evaluateTask(task, aircraft, lastEvent) {
  const hoursSince = aircraft.total_hours - (lastEvent ? Number(lastEvent.performed_at_aircraft_hours) : 0);
  const sinceDate = lastEvent ? new Date(lastEvent.performed_at) : new Date(aircraft.created_at);
  const daysSince = Math.floor((Date.now() - sinceDate.getTime()) / 86_400_000);

  const hasHours = task.interval_hours != null;
  const hasDays = task.interval_calendar_days != null;
  const hasCyclesOnly = task.interval_cycles != null && !hasHours && !hasDays;

  if (hasCyclesOnly) {
    return { status: 'sin_dato', hoursSince: null, daysSince: null, remainingHours: null, remainingDays: null };
  }

  const remainingHours = hasHours ? task.interval_hours - hoursSince : null;
  const remainingDays = hasDays ? task.interval_calendar_days - daysSince : null;

  const toleranceHours =
    task.tolerance_unit === 'hours' ? task.tolerance_value : task.tolerance_unit === 'pct' && hasHours ? (task.interval_hours * task.tolerance_value) / 100 : 0;
  const toleranceDays =
    task.tolerance_unit === 'days' ? task.tolerance_value : task.tolerance_unit === 'pct' && hasDays ? (task.interval_calendar_days * task.tolerance_value) / 100 : 0;

  const overdue = (remainingHours != null && remainingHours <= 0) || (remainingDays != null && remainingDays <= 0);
  const nearing =
    !overdue &&
    ((remainingHours != null && remainingHours <= (toleranceHours || 0)) || (remainingDays != null && remainingDays <= (toleranceDays || 0)));

  return {
    status: overdue ? 'vencida' : nearing ? 'proxima' : 'al_dia',
    hoursSince: hasHours ? Number(hoursSince.toFixed(1)) : null,
    daysSince: hasDays ? daysSince : null,
    remainingHours: remainingHours != null ? Number(remainingHours.toFixed(1)) : null,
    remainingDays: remainingDays != null ? Math.ceil(remainingDays) : null,
  };
}

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
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  // "fuera de servicio" excluida a propósito — no tiene sentido calcular
  // vencimiento de mantenimiento para una aeronave que ya no vuela, y
  // vuelve a incluirse sola si se reactiva.
  const { data: aircraftList, error: aircraftError } = await supabase
    .from('aircraft')
    .select('id, serial_number, model_id, total_hours, created_at, model:model_id(brand, model)')
    .eq('organization_id', organizationId)
    .neq('operational_status', 'fuera_de_servicio');
  if (aircraftError) return Response.json({ error: 'Error consultando la flota' }, { status: 500 });

  const { data: programs, error: programsError } = await supabase
    .from('maintenance_programs')
    .select('model_id, tasks:maintenance_tasks(*)')
    .eq('organization_id', organizationId);
  if (programsError) return Response.json({ error: 'Error consultando programas de mantenimiento' }, { status: 500 });

  const { data: events, error: eventsError } = await supabase
    .from('maintenance_events')
    .select('aircraft_id, task_id, performed_at, performed_at_aircraft_hours')
    .eq('organization_id', organizationId)
    .not('task_id', 'is', null)
    .order('performed_at', { ascending: false });
  if (eventsError) return Response.json({ error: 'Error consultando eventos de mantenimiento' }, { status: 500 });

  const tasksByModel = new Map((programs || []).map((p) => [p.model_id, p.tasks || []]));
  const lastEventByKey = new Map();
  for (const e of events || []) {
    const key = `${e.aircraft_id}:${e.task_id}`;
    if (!lastEventByKey.has(key)) lastEventByKey.set(key, e); // ya viene ordenado por performed_at desc
  }

  const rows = [];
  for (const aircraft of aircraftList || []) {
    const tasks = tasksByModel.get(aircraft.model_id) || [];
    for (const task of tasks) {
      const lastEvent = lastEventByKey.get(`${aircraft.id}:${task.id}`) || null;
      const evaluation = evaluateTask(task, aircraft, lastEvent);
      rows.push({
        aircraftId: aircraft.id,
        aircraftLabel: `${aircraft.model?.brand || ''} ${aircraft.model?.model || ''} — ${aircraft.serial_number}`.trim(),
        taskId: task.id,
        taskName: task.name,
        lastPerformedAt: lastEvent?.performed_at || null,
        ...evaluation,
      });
    }
  }

  rows.sort((a, b) => {
    const order = { vencida: 0, proxima: 1, al_dia: 2, sin_dato: 3 };
    return order[a.status] - order[b.status];
  });

  return Response.json({ status: rows, isManager: isDutyManager(memberships, organizationId) });
}
