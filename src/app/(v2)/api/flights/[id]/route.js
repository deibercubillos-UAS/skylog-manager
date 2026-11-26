// Editar (PATCH) y anular (DELETE) un vuelo ya registrado — matriz D6: Gerente General, Jefe de Pilotos y superadmin.
// Un vuelo es un evento: no se borra. Anular lo oculta de bitácora, reportes y límites conservando quién, cuándo y por qué;
// editar corrige sus datos. En ambos casos el motivo es obligatorio y el detalle antes/después queda en el registro de acciones.
// Se escribe con la llave de servicio (la RLS de `flights` no tiene política de update) DESPUÉS de verificar sesión, membresía,
// rol, custodia legal y datos. Ajusta las horas de la aeronave con `adjust_aircraft_hours`. Requiere la migración 20261118120000.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, getRecentFlights } from '@/lib/v2/duty';
import { membershipsCanEdit, readOnlyBlock } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { asBogotaInstant } from '@/lib/v2/dispatchContext';
import { logAudit } from '@/lib/v2/auditLog';
import { validateFlightReason, validateFlightFields, diffFlight, aircraftHoursAdjustments, voidHoursAdjustment, canBeFlightPilot, flightPilotLocked, evaluateFlightLimits } from '@skylog/domain';

export const dynamic = 'force-dynamic';

const MIGRATION_MISSING = { error: 'Falta aplicar la migración de anulación de vuelos en la base de datos.' };

async function authorize(id) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return { response: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return { response: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!personId) return { response: Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado' }, { status: 404 }) };

  const admin = createAdminClient();
  const { data: flight, error } = await admin.from('flights').select('*').eq('id', id).maybeSingle();
  if (error) return { response: Response.json(error.code === '42703' ? MIGRATION_MISSING : { error: 'Error consultando el vuelo' }, { status: error.code === '42703' ? 503 : 500 }) };
  // Un vuelo de otra organización se responde igual que uno inexistente: no se confirma que existe.
  if (!flight || flight.voided_at || !(memberships || []).some((m) => m.organization_id === flight.organization_id)) {
    return { response: Response.json({ error: 'Vuelo no encontrado' }, { status: 404 }) };
  }
  if (!membershipsCanEdit(memberships, flight.organization_id, 'D6')) {
    return { response: Response.json({ error: 'Tu rol no puede editar ni anular vuelos' }, { status: 403 }) };
  }
  const blocked = readOnlyBlock(memberships, flight.organization_id);
  if (blocked) return { response: blocked };

  // Un vuelo bajo custodia legal activa no se toca (decisión de retención/custodia).
  const { data: held, error: heldError } = await admin.rpc('v2_flight_under_hold', { p_flight_id: id });
  if (heldError) return { response: Response.json({ error: 'No se pudo verificar la custodia legal del vuelo' }, { status: 500 }) };
  if (held) return { response: Response.json({ error: 'Este vuelo está bajo una custodia legal activa y no se puede modificar' }, { status: 409 }) };

  return { admin, flight, personId, supabase };
}

async function applyHours(admin, adjustments) {
  for (const { aircraftId, delta } of adjustments) {
    const { error } = await admin.rpc('adjust_aircraft_hours', { p_id: aircraftId, p_delta: delta });
    if (error) console.error('[flights] adjust_aircraft_hours falló:', error.message);
  }
}

const label = (f) => `Vuelo del ${String(f.takeoff_at).slice(0, 10)} (${Number(f.total_time).toFixed(2)} h)`;

export async function PATCH(request, { params }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.response) return auth.response;
  const { admin, flight, personId, supabase } = auth;

  const body = await request.json().catch(() => ({}));
  const reason = validateFlightReason(body.reason);
  if (!reason.ok) return Response.json({ error: reason.error }, { status: 400 });

  // Solo cambian los campos enviados; la hora llega como en el registro (hora de Colombia sin zona) y se guarda como instante real.
  const next = { ...flight };
  if (body.pilotPersonId !== undefined && body.pilotPersonId !== flight.pilot_person_id) {
    // El vuelo de un despacho lleva el piloto de la constancia (inmutable): no se cambia. El nuevo piloto debe ser miembro
    // activo de la organización con un rol que vuela.
    if (flightPilotLocked(flight)) return Response.json({ error: 'El piloto de un vuelo despachado no se puede cambiar: lo fija la constancia del despacho' }, { status: 409 });
    const { data: member, error: memberError } = await admin
      .from('memberships')
      .select('role')
      .eq('organization_id', flight.organization_id)
      .eq('person_id', String(body.pilotPersonId))
      .eq('status', 'activa')
      .maybeSingle();
    if (memberError) return dbError(memberError, 'flights/[id]');
    if (!member || !canBeFlightPilot(member.role)) return Response.json({ error: 'Ese piloto no es un miembro activo de la organización que pueda volar' }, { status: 400 });
    next.pilot_person_id = String(body.pilotPersonId);
  }
  if (body.takeoffAt !== undefined) next.takeoff_at = asBogotaInstant(body.takeoffAt);
  if (body.landingAt !== undefined) next.landing_at = asBogotaInstant(body.landingAt);
  if (body.totalTime !== undefined) next.total_time = Number(body.totalTime);
  if (body.visualCondition !== undefined) next.visual_condition = body.visualCondition || null;
  if (body.flightRules !== undefined) next.flight_rules = body.flightRules || null;
  if (body.missionType !== undefined) next.mission_type = body.missionType || null;
  if (body.aircraftId !== undefined) next.aircraft_id = body.aircraftId || null;
  const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  if (body.location !== undefined) next.location = text(body.location, 300);
  if (body.notes !== undefined) next.notes = text(body.notes, 2000);
  if (body.flightOrder !== undefined) next.flight_order = text(body.flightOrder, 60);

  const valid = validateFlightFields(next);
  if (!valid.ok) return Response.json({ error: valid.error }, { status: 400 });

  const changes = diffFlight(flight, next);
  if (Object.keys(changes).length === 0) return Response.json({ error: 'No hay cambios para guardar' }, { status: 400 });

  if (changes.takeoff_at || changes.pilot_person_id) {
    const { data: duplicate } = await admin
      .from('flights')
      .select('id')
      .eq('organization_id', flight.organization_id)
      .eq('pilot_person_id', next.pilot_person_id)
      .eq('takeoff_at', next.takeoff_at)
      .is('voided_at', null)
      .neq('id', id)
      .limit(1);
    if (duplicate?.length) return Response.json({ error: 'Ya existe otro vuelo de este piloto con ese despegue' }, { status: 409 });
  }
  if (changes.aircraft_id && next.aircraft_id) {
    const { data: aircraftRow } = await admin.from('aircraft').select('id').eq('id', next.aircraft_id).eq('organization_id', flight.organization_id).maybeSingle();
    if (!aircraftRow) return Response.json({ error: 'La aeronave no pertenece a esta organización' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('flights')
    .update({
      pilot_person_id: next.pilot_person_id,
      takeoff_at: next.takeoff_at,
      landing_at: next.landing_at,
      total_time: next.total_time,
      visual_condition: next.visual_condition,
      flight_rules: next.flight_rules,
      mission_type: next.mission_type,
      aircraft_id: next.aircraft_id,
      location: next.location,
      notes: next.notes,
      flight_order: next.flight_order,
      edited_at: new Date().toISOString(),
      edited_by: personId,
    })
    .eq('id', id)
    .is('voided_at', null)
    .select('*')
    .single();
  if (error) {
    console.error('[flights] editar falló:', error.message);
    return Response.json(error.code === '42703' ? MIGRATION_MISSING : { error: 'No se pudo guardar el cambio' }, { status: error.code === '42703' ? 503 : 500 });
  }

  await applyHours(admin, aircraftHoursAdjustments(flight, next));
  await logAudit({ organizationId: flight.organization_id, action: 'update', module: 'flights', entityLabel: label(flight), metadata: { flightId: id, reason: reason.reason, changes } });

  // Avisos de §100.540 para el piloto del vuelo ya corregido (el vuelo se guarda igual; es solo advertencia). Se pide con la
  // sesión del gestor, sin este vuelo, y solo si el despegue cae en la ventana de 32 días que carga `getRecentFlights`.
  let dutyWarnings = [];
  if (Date.now() - Date.parse(next.takeoff_at) < 31 * 86_400_000) {
    const { data: recent } = await getRecentFlights(supabase, next.pilot_person_id, 32);
    const limits = evaluateFlightLimits((recent || []).filter((f) => f.id !== id), { personId: next.pilot_person_id, takeoffAt: next.takeoff_at, totalTime: Number(next.total_time), lineOfSight: next.visual_condition || 'VLOS' });
    dutyWarnings = limits.warnings || [];
  }
  return Response.json({ flight: data, changes: Object.keys(changes), dutyWarnings });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.response) return auth.response;
  const { admin, flight, personId } = auth;

  const body = await request.json().catch(() => ({}));
  const reason = validateFlightReason(body.reason);
  if (!reason.ok) return Response.json({ error: reason.error }, { status: 400 });

  const { error } = await admin
    .from('flights')
    .update({ voided_at: new Date().toISOString(), voided_by: personId, void_reason: reason.reason })
    .eq('id', id)
    .is('voided_at', null);
  if (error) {
    console.error('[flights] anular falló:', error.message);
    return Response.json(error.code === '42703' ? MIGRATION_MISSING : { error: 'No se pudo anular el vuelo' }, { status: error.code === '42703' ? 503 : 500 });
  }

  await applyHours(admin, voidHoursAdjustment(flight));
  await logAudit({ organizationId: flight.organization_id, action: 'delete', module: 'flights', entityLabel: label(flight), metadata: { flightId: id, reason: reason.reason, pilotPersonId: flight.pilot_person_id, aircraftId: flight.aircraft_id, source: flight.source } });
  return Response.json({ ok: true });
}
