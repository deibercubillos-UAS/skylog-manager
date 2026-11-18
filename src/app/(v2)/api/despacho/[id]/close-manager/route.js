// Skylog V2.0 — Cierre de un despacho por un gestor (matriz F5: GG, JP y superadmin). Para el despacho «huérfano»: el piloto se
// retiró, perdió la membresía o nunca cerró el vuelo, y `/api/despacho/[id]/close` (solo el piloto que despachó) no puede cerrarlo.
// Dos modos, siempre con motivo (queda en el despacho y en el registro de acciones):
//   · con_vuelo: registra el vuelo real a nombre del piloto con las horas indicadas (misma RPC de cierre, mismas reglas de hora);
//   · sin_vuelo: el vuelo no se realizó; el despacho se cierra sin vuelo y la misión pasa a cancelada.
// Requiere la migración 20261118130000 (RPC `v2_dispatch_close_by_manager`, solo servidor).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit, readOnlyBlock } from '@/lib/v2/permissions';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { getAuthUser } from '@/lib/v2/authUser';
import { asBogotaInstant } from '@/lib/v2/dispatchContext';
import { linkFlightWeather } from '@/lib/v2/weatherSnapshot';
import { logAudit } from '@/lib/v2/auditLog';
import { dbError } from '@/lib/v2/apiErrors';
import { validateFlightClose, validateFlightReason } from '@skylog/domain';

const VISUAL_LINES = ['VLOS', 'EVLOS', 'BVLOS'];
const MIGRATION_MISSING = { error: 'Falta aplicar la migración del cierre de despachos por un gestor en la base de datos.' };

export async function POST(request, { params }) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const mode = body.mode;
  if (!['con_vuelo', 'sin_vuelo'].includes(mode)) return Response.json({ error: 'Indica si el vuelo se realizó o no' }, { status: 400 });
  const reason = validateFlightReason(body.reason);
  if (!reason.ok) return Response.json({ error: reason.error }, { status: 400 });
  if (body.visualCondition && !VISUAL_LINES.includes(body.visualCondition)) return Response.json({ error: 'visualCondition debe ser uno de: ' + VISUAL_LINES.join(', ') }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  // La RLS deja ver el despacho a su piloto o a un gestor de la organización; el resto recibe «no encontrado».
  const { data: dispatch, error: fetchError } = await supabase
    .from('dispatches')
    .select('id, organization_id, pilot_person_id, status, dispatched_at, mission:mission_id(name, line_of_sight)')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return dbError(fetchError, 'despacho/close-manager');
  if (!dispatch || !(memberships || []).some((m) => m.organization_id === dispatch.organization_id)) return Response.json({ error: 'Despacho no encontrado' }, { status: 404 });
  if (!membershipsCanEdit(memberships, dispatch.organization_id, 'F5')) return Response.json({ error: 'Tu rol no puede cerrar el despacho de otro piloto' }, { status: 403 });
  const blocked = readOnlyBlock(memberships, dispatch.organization_id);
  if (blocked) return blocked;
  if (dispatch.status !== 'despachado') return Response.json({ error: 'Este despacho ya fue cerrado' }, { status: 409 });

  const mission = Array.isArray(dispatch.mission) ? dispatch.mission[0] : dispatch.mission;
  const payload = { dispatch_id: id, organization_id: dispatch.organization_id, closer_person_id: personId, mode, reason: reason.reason };

  let totalTime = null;
  if (mode === 'con_vuelo') {
    // La hora llega de la pantalla sin zona («2026-11-12T10:00»): es hora de Colombia.
    const takeoffAt = asBogotaInstant(body.takeoffAt);
    const landingAt = asBogotaInstant(body.landingAt);
    const check = validateFlightClose({ dispatchedAt: dispatch.dispatched_at, takeoffAt, landingAt, now: new Date().toISOString(), safetyReport: false });
    if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });
    totalTime = check.totalTime;
    Object.assign(payload, {
      takeoff_at: new Date(takeoffAt).toISOString(),
      landing_at: new Date(landingAt).toISOString(),
      total_time: totalTime,
      visual_condition: body.visualCondition || mission?.line_of_sight || null,
      mission_type: typeof body.missionType === 'string' && body.missionType.trim() ? body.missionType.trim().slice(0, 100) : null,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 2000) : null,
    });
  }

  const admin = createAdminClient();
  const { data: flightId, error } = await admin.rpc('v2_dispatch_close_by_manager', { p: payload });
  if (error) {
    if (['42883', 'PGRST202'].includes(error.code)) return Response.json(MIGRATION_MISSING, { status: 503 });
    return dbError(error, 'despacho/close-manager');
  }

  const weatherLinked = flightId ? await linkFlightWeather(admin, { dispatchId: id, flightId }) : false;
  await logAudit({
    organizationId: dispatch.organization_id,
    action: 'update',
    module: 'dispatch',
    entityLabel: `Despacho «${mission?.name || 'misión'}» cerrado por un gestor (${mode === 'sin_vuelo' ? 'sin vuelo' : `${totalTime} h`})`,
    metadata: { dispatchId: id, mode, reason: reason.reason, pilotPersonId: dispatch.pilot_person_id, flightId: flightId || null },
  });
  return Response.json({ ok: true, mode, flightId: flightId || null, totalTime, weatherLinked });
}
