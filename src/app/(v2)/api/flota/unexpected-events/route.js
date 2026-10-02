// Skylog V2.0 — Flota & Equipo, Fase 4c: Eventos inesperados
// (`MAUT-5.0-12-090` ítem 19) — aterrizaje fuerte, impacto de aves, FOD o
// pérdida de hélice. Reportar es abierto a CUALQUIER miembro activo (quien
// lo vive es quien primero puede reportarlo, mismo criterio ya usado en
// SMS para MOR/VOR) — evaluarlo y cerrarlo es función de gestión
// (`.../[id]` PATCH). Reportar un evento inesperado deja la aeronave en
// mantenimiento de inmediato (grounded) hasta que se evalúe — nunca sigue
// disponible con un suceso de este tipo sin resolver.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { classifyReportRoute } from '@skylog/domain';

const EVENT_TYPES = ['aterrizaje_fuerte', 'impacto_aves', 'fod', 'perdida_helice'];

// SMS-E (40-sms.md §5.4/§5.9) — ninguno de los 4 tipos coincide exactamente
// con los 12 eventos UAS de reporte obligatorio (`UAS_MANDATORY_EVENTS`,
// comms/datalink/control/espacio aéreo); se usan códigos propios, mismo
// criterio ya aplicado a 'MED' (fatiga) en la excepción de tiempo de
// servicio — no se fuerza un evento normativo que no describe lo ocurrido.
const EVENT_CODE_BY_TYPE = {
  aterrizaje_fuerte: 'EVT-ATF',
  impacto_aves: 'EVT-BIRD',
  fod: 'EVT-FOD',
  perdida_helice: 'EVT-PROP',
};
const EVENT_LABEL_BY_TYPE = {
  aterrizaje_fuerte: 'aterrizaje fuerte',
  impacto_aves: 'impacto de aves',
  fod: 'objeto extraño (FOD)',
  perdida_helice: 'pérdida de hélice',
};

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

  const { data: events, error } = await supabase
    .from('unexpected_events')
    .select(
      '*, aircraft:aircraft_id(serial_number, model:model_id(brand, model)), reporter:reported_by(full_name), evaluator:evaluated_by(full_name)'
    )
    .eq('organization_id', organizationId)
    .order('reported_at', { ascending: false });
  if (error) return Response.json({ error: 'Error consultando eventos inesperados' }, { status: 500 });

  return Response.json({ events, isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, aircraftId, flightId, type, description } = body;
  if (!organizationId || !aircraftId || !type) {
    return Response.json({ error: 'organizationId, aircraftId y type son requeridos' }, { status: 400 });
  }
  if (!EVENT_TYPES.includes(type)) {
    return Response.json({ error: 'type debe ser uno de: ' + EVENT_TYPES.join(', ') }, { status: 400 });
  }

  const { error: resolveError, personId, organizationIds, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!organizationIds.includes(organizationId)) {
    return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });
  }

  const { data: aircraft, error: aircraftError } = await supabase
    .from('aircraft')
    .select('id, operational_status')
    .eq('id', aircraftId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (aircraftError) return Response.json({ error: 'Error verificando la aeronave' }, { status: 500 });
  if (!aircraft) return Response.json({ error: 'La aeronave no pertenece a esta organización' }, { status: 400 });

  if (flightId) {
    const { data: flight, error: flightError } = await supabase.from('flights').select('id').eq('id', flightId).eq('organization_id', organizationId).maybeSingle();
    if (flightError) return Response.json({ error: 'Error verificando el vuelo' }, { status: 500 });
    if (!flight) return Response.json({ error: 'El vuelo no pertenece a esta organización' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('unexpected_events')
    .insert({
      organization_id: organizationId,
      aircraft_id: aircraftId,
      flight_id: flightId || null,
      type,
      description: description || null,
      reported_by: personId,
    })
    .select('*, aircraft:aircraft_id(serial_number, model:model_id(brand, model)), reporter:reported_by(full_name)')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Deja la aeronave en tierra de inmediato hasta que se evalúe — nunca
  // sigue "disponible" con un suceso de este tipo sin resolver. Si ya
  // estaba fuera de servicio, se respeta ese estado (no se reactiva sola).
  if (aircraft.operational_status !== 'fuera_de_servicio') {
    await supabase.from('aircraft').update({ operational_status: 'en_mantenimiento' }).eq('id', aircraftId);
  }

  // SMS-E — "SMS alimentado por la operación" (40-sms.md §5.4/§5.9): un
  // evento inesperado ya ocurrió y ya dejó la aeronave en tierra — se
  // convierte solo en un BORRADOR de reporte SMS, nunca en uno radicado (el
  // Gerente SMS sigue confirmando/analizando/descartando por el flujo
  // normal de casos). Fire-and-forget, mismo patrón que la decisión 50.
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  try {
    const route = classifyReportRoute({ severity: 'incidente', reportedByRole: membership?.role });
    await supabase.from('sms_reports').insert({
      organization_id: organizationId,
      reported_by: personId,
      severity: 'incidente',
      route: route.route,
      requires_manager_analysis: route.requiresManagerAnalysis,
      event_code: EVENT_CODE_BY_TYPE[type],
      description: `Borrador automático — evento inesperado reportado en vuelo: ${EVENT_LABEL_BY_TYPE[type]}.${description ? ` ${description}` : ''}`,
      source: 'auto_unexpected_event',
    });
  } catch {
    // silencioso — el evento inesperado ya se guardó y la aeronave ya quedó
    // en tierra; el borrador SMS es un efecto secundario informativo.
  }

  return Response.json({ event: data });
}
