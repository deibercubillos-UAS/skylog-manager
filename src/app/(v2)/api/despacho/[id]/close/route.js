// Skylog V2.0 — Cierre de vuelo. Toma un despacho abierto y registra el vuelo REAL: horas
// calculadas por el servidor, enlazado a la misión, con suma atómica de horas a la aeronave
// (RPC `v2_dispatch_close`). Cierra también el despacho y la misión.
//
// Un vuelo que YA ocurrió siempre se registra: si excede un límite de §100.540 se guarda igual y se
// devuelve `dutyWarnings`. Negarse a guardarlo (como hace la carga manual en POST /api/flights, que
// registra algo hipotético) dejaría el libro de vuelo sin un vuelo real — peor evidencia que un
// vuelo con la advertencia visible.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, getRecentFlights } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { validateFlightClose, checkMonthlyFlightHours, checkDailyFlightHours, dayKey, monthKey } from '@skylog/domain';

const VISUAL_LINES = ['VLOS', 'EVLOS', 'BVLOS'];

export async function POST(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { takeoffAt, landingAt, visualCondition, missionType, notes, safetyReport, safetyReportType } = body;
  if (visualCondition && !VISUAL_LINES.includes(visualCondition)) {
    return Response.json({ error: 'visualCondition debe ser uno de: ' + VISUAL_LINES.join(', ') }, { status: 400 });
  }

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  // RLS: el piloto solo ve sus despachos y un gestor los de su organización.
  const { data: dispatch, error: fetchError } = await supabase
    .from('dispatches')
    .select('id, organization_id, pilot_person_id, status, dispatched_at, aircraft_id, mission:mission_id(line_of_sight)')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el despacho' }, { status: 500 });
  if (!dispatch) return Response.json({ error: 'Despacho no encontrado' }, { status: 404 });
  if (dispatch.pilot_person_id !== personId) return Response.json({ error: 'Solo el piloto que despachó puede cerrar el vuelo' }, { status: 403 });
  if (dispatch.status !== 'despachado') return Response.json({ error: 'Este despacho ya fue cerrado' }, { status: 409 });

  const now = new Date();
  const check = validateFlightClose({ dispatchedAt: dispatch.dispatched_at, takeoffAt, landingAt, now: now.toISOString(), safetyReport: !!safetyReport, safetyReportType });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

  const mission = Array.isArray(dispatch.mission) ? dispatch.mission[0] : dispatch.mission;
  const lineOfSight = visualCondition || mission?.line_of_sight || null;

  // Advertencia (no bloqueo) de límites §100.540 incluyendo este vuelo.
  const { data: recent } = await getRecentFlights(supabase, personId, 32);
  const takeoffDate = new Date(takeoffAt);
  const projected = [
    ...recent.map((f) => ({ personId, date: f.takeoff_at, totalTimeHours: Number(f.total_time) })),
    { personId, date: takeoffAt, totalTimeHours: check.totalTime },
  ];
  const monthly = checkMonthlyFlightHours(projected, { personId, month: monthKey(takeoffDate) });
  const daily = checkDailyFlightHours(projected, { personId, day: dayKey(takeoffDate), lineOfSight: lineOfSight || 'VLOS' });
  const dutyWarnings = [];
  if (!monthly.compliant) dutyWarnings.push('Con este vuelo se excede el límite mensual de horas de vuelo (§100.540).');
  if (!daily.compliant) dutyWarnings.push('Con este vuelo se excede el límite diario de horas de vuelo (§100.540).');

  const { data: flightId, error } = await createAdminClient().rpc('v2_dispatch_close', {
    p: {
      dispatch_id: id,
      pilot_person_id: personId,
      takeoff_at: new Date(takeoffAt).toISOString(),
      landing_at: new Date(landingAt).toISOString(),
      total_time: check.totalTime,
      visual_condition: lineOfSight,
      mission_type: missionType?.trim() || null,
      notes: notes?.trim() || null,
      safety_report: !!safetyReport,
      safety_report_type: safetyReport ? safetyReportType : null,
    },
  });
  if (error) {
    console.error('[despacho] v2_dispatch_close falló:', error.message);
    const known = /ya fue cerrado|Solo el piloto/.test(error.message);
    return Response.json({ error: known ? error.message : 'No se pudo registrar el cierre del vuelo' }, { status: known ? 409 : 500 });
  }

  return Response.json({ flightId, totalTime: check.totalTime, dutyWarnings, safetyReport: !!safetyReport, safetyReportType: safetyReport ? safetyReportType : null });
}
