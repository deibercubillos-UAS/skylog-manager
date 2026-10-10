// Skylog V2.0 — Custodia legal por suceso (ítem 34 de MAUT-5.0-12-095;
// RAC 100 §100.535(29)). Abrir una custodia congela los vuelos elegidos: no se
// pueden borrar ni perder su replay hasta que una AUTORIDAD (admin / gerente
// SMS) la libere. Lo que realmente lo impide son los triggers de la migración
// 20261005010000; aquí solo se gestiona.
//
// La bitácora (`legal_hold_events`) la escribe SOLO el servidor con service
// role: ninguna política RLS deja insertar ahí a un usuario, para que nadie
// pueda falsear quién abrió, liberó o consultó el material.
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { createNotifications } from '@/lib/v2/notify';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { canReleaseHold } from '@skylog/domain';

const HOLD_SELECT = `
  *,
  opener:opened_by(full_name),
  releaser:released_by(full_name),
  legal_hold_flights(flight_id, flight:flight_id(takeoff_at, mission_type, aircraft:aircraft_id(serial_number, model:model_id(brand, model)))),
  legal_hold_events(id, event_type, flight_id, detail, created_at, actor:actor_person_id(full_name))
`;

async function authenticate(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!personId) return { error: Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 }) };
  return { personId, memberships };
}

// Escribe en la bitácora de la custodia. Devuelve un aviso (string) si falló, nunca lanza:
// la acción ya ocurrió y el usuario debe enterarse de que la constancia no quedó.
async function logEvent({ holdId, type, personId, flightId = null, detail = null }) {
  const { error } = await createAdminClient().from('legal_hold_events').insert({
    hold_id: holdId,
    event_type: type,
    actor_person_id: personId,
    flight_id: flightId,
    detail,
  });
  return error ? 'La acción se realizó, pero no se pudo registrar en la bitácora de la custodia.' : null;
}

async function validateFlights(supabase, organizationId, flightIds) {
  const unique = [...new Set(flightIds)];
  const { data, error } = await supabase.from('flights').select('id').eq('organization_id', organizationId).in('id', unique);
  if (error) return Response.json({ error: 'Error validando los vuelos' }, { status: 500 });
  if ((data || []).length !== unique.length) return Response.json({ error: 'Algún vuelo no existe en esta organización' }, { status: 400 });
  return null;
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const auth = await authenticate(supabase);
  if (auth.error) return auth.error;

  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  if (!isDutyManager(auth.memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede ver las custodias legales' }, { status: 403 });
  }

  const { data, error } = await supabase.from('legal_holds').select(HOLD_SELECT).eq('organization_id', organizationId).order('opened_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ holds: data || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const auth = await authenticate(supabase);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { organizationId, reason, flightIds, smsCaseId } = body;
  if (!organizationId || !reason?.trim() || !Array.isArray(flightIds) || flightIds.length === 0) {
    return Response.json({ error: 'organizationId, reason y al menos un vuelo (flightIds) son requeridos' }, { status: 400 });
  }
  if (!isDutyManager(auth.memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede abrir una custodia legal' }, { status: 403 });
  }
  const flightError = await validateFlights(supabase, organizationId, flightIds);
  if (flightError) return flightError;

  if (smsCaseId) {
    const { data: smsCase } = await supabase.from('sms_cases').select('id').eq('id', smsCaseId).eq('organization_id', organizationId).maybeSingle();
    if (!smsCase) return Response.json({ error: 'El caso SMS no existe en esta organización' }, { status: 400 });
  }

  const { data: hold, error } = await supabase
    .from('legal_holds')
    .insert({ organization_id: organizationId, reason: reason.trim(), sms_case_id: smsCaseId || null, opened_by: auth.personId })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { error: linkError } = await supabase.from('legal_hold_flights').insert([...new Set(flightIds)].map((flight_id) => ({ hold_id: hold.id, flight_id })));
  if (linkError) {
    // Una custodia no se puede borrar: queda abierta, vacía, y se completa con la acción add_flights.
    return Response.json({ error: 'La custodia se abrió pero no se pudieron enlazar los vuelos. Agrégalos de nuevo desde la custodia.', holdId: hold.id }, { status: 500 });
  }

  const warning = await logEvent({ holdId: hold.id, type: 'opened', personId: auth.personId, detail: reason.trim() });
  await createNotifications({
    organizationId,
    roles: ['admin', 'gerente_sms'],
    type: 'custodia_abierta',
    title: 'Se abrió una custodia legal',
    body: reason.trim().slice(0, 200),
    link: '/retencion',
    actorPersonId: auth.personId,
  });
  await logAudit({ organizationId, action: 'create', module: 'Custodia legal', entityLabel: reason.trim().slice(0, 120) });
  return Response.json({ hold, warning });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const auth = await authenticate(supabase);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { id, action, releaseReason, flightIds } = body;
  if (!id || !['release', 'add_flights'].includes(action)) {
    return Response.json({ error: "id y action ('release' | 'add_flights') son requeridos" }, { status: 400 });
  }

  const { data: hold, error: fetchError } = await supabase.from('legal_holds').select('id, organization_id, released_at').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!hold) return Response.json({ error: 'Custodia no encontrada' }, { status: 404 });
  if (hold.released_at) return Response.json({ error: 'Esta custodia ya fue liberada y no admite cambios' }, { status: 409 });

  const membership = (auth.memberships || []).find((m) => m.organization_id === hold.organization_id);
  if (!isDutyManager(auth.memberships, hold.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede modificar una custodia' }, { status: 403 });
  }

  if (action === 'release') {
    if (!canReleaseHold(membership?.role)) {
      return Response.json({ error: 'Solo una autoridad (Gerente General o Gerente SMS) puede liberar una custodia legal' }, { status: 403 });
    }
    if (!releaseReason?.trim()) return Response.json({ error: 'releaseReason es requerido' }, { status: 400 });

    const { data, error } = await supabase
      .from('legal_holds')
      .update({ released_at: new Date().toISOString(), released_by: auth.personId, release_reason: releaseReason.trim() })
      .eq('id', id)
      .is('released_at', null)
      .select()
      .maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!data) return Response.json({ error: 'No se pudo liberar la custodia (sin permiso o ya liberada)' }, { status: 403 });

    const warning = await logEvent({ holdId: id, type: 'released', personId: auth.personId, detail: releaseReason.trim() });
    return Response.json({ hold: data, warning });
  }

  // add_flights
  if (!Array.isArray(flightIds) || flightIds.length === 0) return Response.json({ error: 'flightIds es requerido' }, { status: 400 });
  const flightError = await validateFlights(supabase, hold.organization_id, flightIds);
  if (flightError) return flightError;

  const { error: linkError } = await supabase
    .from('legal_hold_flights')
    .upsert([...new Set(flightIds)].map((flight_id) => ({ hold_id: id, flight_id })), { onConflict: 'hold_id,flight_id', ignoreDuplicates: true });
  if (linkError) return Response.json({ error: linkError.message }, { status: 500 });

  const warning = await logEvent({ holdId: id, type: 'flights_added', personId: auth.personId, detail: `Se agregaron ${new Set(flightIds).size} vuelo(s) a la custodia` });
  return Response.json({ ok: true, warning });
}
