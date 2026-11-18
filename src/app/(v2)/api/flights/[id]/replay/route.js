// Skylog V2.0 — Replay GPS. Trae la traza completa de un vuelo puntual —
// separado de GET /api/flights (que solo manda `has_replay`, ver esa ruta)
// para no pagar el costo de 400 puntos × 200 filas en cada carga de
// Bitácora. La visibilidad la sigue decidiendo la RLS de `flights` (mismo
// criterio que el resto de rutas de vuelos): no se repite el chequeo de rol
// aquí, basta con que la fila se devuelva o no.
//
// Custodia legal (ítem 34 de MAUT-5.0-12-095): si el vuelo está bajo una
// custodia activa, CADA consulta del replay queda registrada en la bitácora
// de la custodia (quién y cuándo) — la escribe el servidor con service role,
// porque un piloto que ve el replay no puede ver ni escribir custodias por
// RLS. Falla CERRADO: si no se puede dejar la constancia, no se entrega el
// material (un acceso sin rastro es justo lo que la custodia debe impedir).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { getAuthUser } from '@/lib/v2/authUser';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { verifyFlightImport } from '@/lib/v2/flightImportToken';
import { asBogotaInstant } from '@/lib/v2/dispatchContext';
import { logAudit } from '@/lib/v2/auditLog';
import { dbError } from '@/lib/v2/apiErrors';
import { validateReplayPayload } from '@skylog/domain';

export async function GET(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase.from('flights').select('replay_track').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: 'Error consultando el replay' }, { status: 500 });
  if (!data) return Response.json({ error: 'Vuelo no encontrado' }, { status: 404 });
  if (!data.replay_track) return Response.json({ error: 'Este vuelo no tiene replay GPS' }, { status: 404 });

  // Solo después de confirmar que el usuario SÍ ve el vuelo: no se filtra el estado de custodia de vuelos ajenos.
  // Verificar la custodia exige service role; sin llave real se dice por qué en vez de un 503 mudo.
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  const admin = createAdminClient();
  const { data: activeHolds, error: holdError } = await admin
    .from('legal_hold_flights')
    .select('hold_id, legal_holds!inner(released_at)')
    .eq('flight_id', id)
    .is('legal_holds.released_at', null);
  if (holdError) return Response.json({ error: 'No se pudo verificar la custodia legal del vuelo' }, { status: 503 });

  if (activeHolds?.length) {
    const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
    if (resolveError) return Response.json({ error: 'No se pudo identificar a quien consulta' }, { status: 503 });

    const { error: logError } = await admin.from('legal_hold_events').insert(
      activeHolds.map((h) => ({ hold_id: h.hold_id, event_type: 'accessed', actor_person_id: personId, flight_id: id, detail: 'Consulta de replay GPS' }))
    );
    if (logError) {
      return Response.json({ error: 'Este vuelo está bajo custodia legal y no se pudo registrar el acceso; no se entrega el replay.' }, { status: 503 });
    }
  }

  return Response.json({ track: data.replay_track });
}

// PUT — actualiza el replay de un vuelo ya guardado con los datos de su log (palancas, satélites, señal, alertas…), p. ej. un vuelo
// importado antes del replay completo. Lo puede hacer quien edita vuelos (D6) o el propio piloto del vuelo (D4). El log tiene que
// ser el de ESE vuelo: se analiza por /api/flights/import-dji (que firma lo leído para esta persona) y su despegue debe coincidir con el
// del vuelo (±10 min). Solo cambia `replay_track`: ni horas, ni aeronave, ni baterías. Un vuelo bajo custodia legal no se toca.
export async function PUT(request, { params }) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { replayTrack, importToken, takeoffAt, landingAt, totalTime, batterySerial, batteryCycles } = body;

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado' }, { status: 404 });

  // La RLS decide si ve el vuelo (su piloto o un gestor); si no, «no encontrado».
  const { data: flight, error: fetchError } = await supabase.from('flights').select('id, organization_id, pilot_person_id, takeoff_at').eq('id', id).maybeSingle();
  if (fetchError) return dbError(fetchError, 'flights/[id]/replay');
  if (!flight) return Response.json({ error: 'Vuelo no encontrado' }, { status: 404 });
  const allowed = membershipsCanEdit(memberships, flight.organization_id, 'D6') || (flight.pilot_person_id === personId && membershipsCanEdit(memberships, flight.organization_id, 'D4'));
  if (!allowed) return Response.json({ error: 'Tu rol no puede actualizar el replay de este vuelo' }, { status: 403 });

  if (!verifyFlightImport(importToken, { personId, takeoffAt, landingAt, totalTime, batterySerial, batteryCycles })) {
    return Response.json({ error: 'El log no se pudo verificar: vuelve a cargarlo para analizarlo de nuevo' }, { status: 400 });
  }
  const logStart = Date.parse(asBogotaInstant(takeoffAt));
  if (!Number.isFinite(logStart) || Math.abs(logStart - Date.parse(flight.takeoff_at)) > 10 * 60 * 1000) {
    return Response.json({ error: 'Este log no corresponde a este vuelo (el despegue no coincide). Carga el log del mismo vuelo.' }, { status: 409 });
  }
  const check = validateReplayPayload(replayTrack);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });

  const admin = createAdminClient();
  const { data: held, error: heldError } = await admin.rpc('v2_flight_under_hold', { p_flight_id: id });
  if (heldError) return Response.json({ error: 'No se pudo verificar la custodia legal del vuelo' }, { status: 500 });
  if (held) return Response.json({ error: 'Este vuelo está bajo una custodia legal activa y no se puede modificar' }, { status: 409 });

  const { error: updateError } = await admin.from('flights').update({ replay_track: check.value }).eq('id', id);
  if (updateError) return dbError(updateError, 'flights/[id]/replay');
  await logAudit({ organizationId: flight.organization_id, action: 'update', module: 'flights', entityLabel: `Replay actualizado del vuelo del ${String(flight.takeoff_at).slice(0, 10)}`, metadata: { flightId: id, formato: check.value.v ? 'v2' : 'lista' } });
  return Response.json({ ok: true });
}
