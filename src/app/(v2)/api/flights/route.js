// Skylog V2.0 — entidad Operación (forma mínima). Registro de un vuelo real —
// el insumo que F5 necesita para evaluar §100.540(c)(1)/(d)(1). No es el
// libro de vuelo completo (eso es Programación/Despacho, fuera de alcance de
// F5) — solo lo mínimo para que el motor de cumplimiento tenga datos reales.
//
// Bloqueo real (41-tiempos-servicio.md §7.2): si este vuelo llevaría al
// piloto a exceder el límite mensual (90h) o diario (6-8h según línea de
// vista), se **rechaza** con 409 — no se guarda y se avisa después. El
// cálculo reutiliza packages/domain, nunca se reimplementa aquí.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, getRecentFlights } from '@/lib/v2/duty';
import { checkMonthlyFlightHours, checkDailyFlightHours } from '@skylog/domain';

const VISUAL_CONDITIONS = ['VLOS', 'EVLOS', 'BVLOS'];

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, takeoffAt, landingAt, totalTime, visualCondition, missionType } = body;

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

  const candidate = { personId, date: takeoffAt, totalTimeHours: Number(totalTime) };
  const projected = [
    ...recentFlights.map((f) => ({ personId: f.pilot_person_id, date: f.takeoff_at, totalTimeHours: Number(f.total_time) })),
    candidate,
  ];

  const monthly = checkMonthlyFlightHours(projected, { personId, month: monthKey(takeoffDate) });
  const daily = checkDailyFlightHours(projected, {
    personId,
    day: dayKey(takeoffDate),
    lineOfSight: visualCondition || 'VLOS',
  });

  if (!monthly.compliant || !daily.compliant) {
    return Response.json(
      {
        error: 'Este vuelo excedería un límite de §100.540 y no se guardó',
        checks: { monthly, daily },
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('flights')
    .insert({
      organization_id: organizationId,
      pilot_person_id: personId,
      takeoff_at: takeoffAt,
      landing_at: landingAt,
      total_time: totalTime,
      visual_condition: visualCondition || null,
      mission_type: missionType || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ flight: data, checks: { monthly, daily } });
}
