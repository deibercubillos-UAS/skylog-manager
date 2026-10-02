// Skylog V2.0 — F5 §100.540. Estado actual de tiempos de servicio de la persona
// autenticada: período abierto (si hay) + evaluación completa de cumplimiento
// (horas mensuales/diarias de vuelo + operación continua). El cálculo en sí vive
// en packages/domain/dutyCompliance.js — función pura, sin Supabase, con tests.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager, getOpenDutyPeriod, getRecentDutyPeriods, getRecentFlights } from '@/lib/v2/duty';
import { evaluateDutyCompliance } from '@skylog/domain';

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

// `personId`/`organizationId` opcionales — un gestor puede consultar el
// estado de OTRO piloto de su organización (filtro por piloto en la UI,
// pedido del usuario). Sin esos params, se resuelve la persona de la sesión
// (comportamiento original, sin cambios para un piloto viendo lo suyo).
export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId: selfPersonId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!selfPersonId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const requestedPersonId = searchParams.get('personId');
  const organizationId = searchParams.get('organizationId');

  let personId = selfPersonId;
  if (requestedPersonId && requestedPersonId !== selfPersonId) {
    if (!organizationId || !isDutyManager(memberships, organizationId)) {
      return Response.json({ error: 'Solo un gestor puede consultar el estado de otro piloto' }, { status: 403 });
    }
    personId = requestedPersonId;
  }

  const [
    { data: open, error: openError },
    { data: recentPeriods, error: periodsError },
    { data: recentFlights, error: flightsError },
  ] = await Promise.all([
    getOpenDutyPeriod(supabase, personId),
    getRecentDutyPeriods(supabase, personId, 32),
    getRecentFlights(supabase, personId, 32),
  ]);
  if (openError || periodsError || flightsError) {
    return Response.json({ error: 'Error consultando períodos/vuelos' }, { status: 500 });
  }

  const now = new Date();
  const today = dayKey(now);

  const domainPeriods = recentPeriods.map((p) => ({
    personId: p.person_id,
    type: p.type,
    startedAt: p.started_at,
    endedAt: p.ended_at || now.toISOString(), // el abierto se evalúa "hasta ahora"
  }));

  const domainFlights = recentFlights.map((f) => ({
    personId: f.pilot_person_id,
    date: f.takeoff_at,
    totalTimeHours: Number(f.total_time),
    lineOfSight: f.visual_condition,
  }));

  // §100.540(d)(1) — el límite diario depende de la línea de vista: si hoy hubo
  // algún vuelo BVLOS, aplica el umbral más estricto (6h); si no, VLOS/EVLOS (8h).
  const todayFlights = domainFlights.filter((f) => dayKey(new Date(f.date)) === today);
  const lineOfSight = todayFlights.some((f) => f.lineOfSight === 'BVLOS') ? 'BVLOS' : 'VLOS';

  const compliance = evaluateDutyCompliance(
    { dutyPeriods: domainPeriods, flights: domainFlights },
    { personId, month: monthKey(now), day: today, lineOfSight }
  );

  return Response.json({ openPeriod: open || null, compliance });
}
