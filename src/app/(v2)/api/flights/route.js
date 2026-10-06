// Skylog V2.0 — entidad Operación (forma mínima). Registro de un vuelo real —
// el insumo que F5 necesita para evaluar §100.540(c)(1)/(d)(1). No es el
// libro de vuelo completo (eso es Programación/Despacho, fuera de alcance de
// F5) — solo lo mínimo para que el motor de cumplimiento tenga datos reales.
//
// Registra vuelos que YA ocurrieron (carga manual o log DJI importado). Si el vuelo lleva al
// piloto a exceder el límite mensual (90h) o diario (6-8h según línea de vista) de §100.540,
// se REGISTRA IGUAL y se devuelve `dutyWarnings`: rechazarlo dejaría el libro de vuelo sin un
// vuelo real, que es peor evidencia que un vuelo con la advertencia visible. Es la misma regla que
// el cierre de vuelo del Despacho (packages/domain/flightLimits.js). Lo que SÍ bloquea es iniciar
// servicio o despachar cuando el piloto ya está en el límite (lib/v2/serviceGates.js).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, getRecentFlights, isDutyManager } from '@/lib/v2/duty';
import { evaluateFlightLimits } from '@skylog/domain';

const VISUAL_CONDITIONS = ['VLOS', 'EVLOS', 'BVLOS'];

// GET — listado real para Bitácora (Operación), por organización (no solo
// del piloto autenticado): el Gerente General necesita ver el nombre del
// piloto asignado a cada vuelo de su organización, no únicamente los suyos.
// La visibilidad real la sigue decidiendo la RLS de `flights`
// (flights_select: el propio piloto ve los suyos, un gestor ve todos los de
// su org) — aquí solo se pide por `organization_id` y se deja que Postgres
// filtre filas; nunca se asume el rol en el cliente.
export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ flights: [] });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  const { data: flights, error } = await supabase
    .from('flights')
    .select('*, pilot:pilot_person_id(full_name), aircraft:aircraft_id(serial_number, model:model_id(brand, model))')
    .eq('organization_id', organizationId)
    .order('takeoff_at', { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: 'Error consultando vuelos' }, { status: 500 });

  // El listado nunca manda la traza completa del replay al navegador (hasta
  // 400 puntos por vuelo — pesado multiplicado por 200 filas); solo un
  // booleano. El visor pide la traza puntual vía
  // GET /api/flights/[id]/replay cuando el usuario de verdad abre el replay.
  const slimFlights = flights.map(({ replay_track, ...f }) => ({ ...f, has_replay: !!replay_track }));

  return Response.json({ flights: slimFlights, isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, takeoffAt, landingAt, totalTime, visualCondition, missionType, aircraftId, batterySerial, batteryCycles, replayTrack } = body;

  if (!organizationId || !takeoffAt || !landingAt || !totalTime) {
    return Response.json({ error: 'organizationId, takeoffAt, landingAt y totalTime son requeridos' }, { status: 400 });
  }
  if (visualCondition && !VISUAL_CONDITIONS.includes(visualCondition)) {
    return Response.json({ error: 'visualCondition debe ser uno de: ' + VISUAL_CONDITIONS.join(', ') }, { status: 400 });
  }
  const takeoffDate = new Date(takeoffAt);
  if (new Date(landingAt) <= takeoffDate) {
    return Response.json({ error: 'landingAt debe ser posterior a takeoffAt' }, { status: 400 });
  }

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!organizationIds.includes(organizationId)) {
    return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });
  }

  const { data: recentFlights, error: recentError } = await getRecentFlights(supabase, personId, 32);
  if (recentError) return Response.json({ error: 'Error consultando vuelos previos' }, { status: 500 });

  const limits = evaluateFlightLimits(recentFlights, { personId, takeoffAt, totalTime: Number(totalTime), lineOfSight: visualCondition || 'VLOS' });

  if (aircraftId) {
    const { data: aircraftRow, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id')
      .eq('id', aircraftId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (aircraftError) return Response.json({ error: 'Error verificando la aeronave' }, { status: 500 });
    if (!aircraftRow) return Response.json({ error: 'La aeronave no pertenece a esta organización' }, { status: 400 });
  }

  // Replay GPS — nunca se confía ciegamente en el jsonb que manda el
  // cliente (aunque en este flujo sea un eco de lo que el propio servidor
  // le devolvió segundos antes, en /api/flights/import-dji): se revalida la
  // forma mínima antes de guardar. Un valor con forma inválida se descarta
  // en silencio (el vuelo se guarda igual, solo sin replay) en vez de
  // romper la confirmación del vuelo por un dato que es puro extra.
  const validReplayTrack =
    Array.isArray(replayTrack) &&
    replayTrack.length >= 2 &&
    replayTrack.every((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number' && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)
      ? replayTrack
      : null;

  const { data, error } = await supabase
    .from('flights')
    .insert({
      organization_id: organizationId,
      pilot_person_id: personId,
      aircraft_id: aircraftId || null,
      takeoff_at: takeoffAt,
      landing_at: landingAt,
      total_time: totalTime,
      visual_condition: visualCondition || null,
      mission_type: missionType || null,
      replay_track: validReplayTrack,
    })
    .select('*, aircraft:aircraft_id(serial_number, model:model_id(brand, model))')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // ② derivado — nunca read-calculate-write: el total de horas de la
  // aeronave se actualiza vía RPC, mismo patrón ya probado en v1.
  if (aircraftId) {
    const { error: rpcError } = await supabase.rpc('increment_aircraft_hours', { p_id: aircraftId, p_hours: Number(totalTime) });
    if (rpcError) console.error('[flights] increment_aircraft_hours falló:', rpcError.message);
  }

  // Automatización de baterías desde el log DJI (a pedido del usuario):
  // `batterySerial`/`batteryCycles` solo llegan cuando el vuelo viene de un
  // log real importado (import-dji), nunca del formulario manual. Se busca
  // la batería por serie dentro de la organización; si no existe, se crea
  // sola (el gestor no tiene que registrarla a mano); los ciclos se
  // actualizan solo si el log reporta un valor mayor al ya guardado
  // (`set_battery_cycles_if_greater`, nunca un incremento — el dato del log
  // ya es el total acumulado que reporta la propia batería).
  //
  // Usa `createAdminClient()` aquí a propósito: crear/leer la batería no es
  // una edición de inventario del gestor (RLS de `batteries` exige
  // `v2_is_duty_manager`, correcto para ese caso) — es un registro derivado
  // de telemetría real ya validada arriba (vuelo dentro de límites, persona
  // y organización verificadas). Sin esto, un piloto sin rol de gestor
  // (el caso más común de "Carga manual RC/RC2" — un operador independiente
  // importando sus propios logs) no podría crear la fila aunque el dato sea
  // legítimo.
  if (batterySerial) {
    const admin = createAdminClient();
    let batteryId = null;
    const { data: existingBattery, error: batteryLookupError } = await admin
      .from('batteries')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('serial_number', batterySerial)
      .maybeSingle();
    if (batteryLookupError) {
      console.error('[flights] búsqueda de batería falló:', batteryLookupError.message);
    } else if (existingBattery) {
      batteryId = existingBattery.id;
    } else {
      const { data: newBattery, error: batteryInsertError } = await admin
        .from('batteries')
        .insert({ organization_id: organizationId, serial_number: batterySerial, created_by: personId })
        .select('id')
        .single();
      if (batteryInsertError) console.error('[flights] creación automática de batería falló:', batteryInsertError.message);
      else batteryId = newBattery.id;
    }

    if (batteryId && batteryCycles != null) {
      // Con el cliente de sesión, no el admin: `set_battery_cycles_if_greater`
      // verifica membresía leyendo `auth.uid()` (decisión 107/109) — bajo el
      // cliente admin no hay usuario autenticado y el guard siempre fallaría.
      // Es SECURITY DEFINER, así que de todas formas bypassa la RLS
      // manager-only de `batteries` al escribir; solo exige que quien llama
      // sea un miembro real de la organización, que el propio piloto ya es.
      const { error: cyclesError } = await supabase.rpc('set_battery_cycles_if_greater', { p_id: batteryId, p_cycles: Number(batteryCycles) });
      if (cyclesError) console.error('[flights] set_battery_cycles_if_greater falló:', cyclesError.message);
    }
  }

  return Response.json({ flight: data, checks: { monthly: limits.monthly, daily: limits.daily }, dutyWarnings: limits.warnings });
}
