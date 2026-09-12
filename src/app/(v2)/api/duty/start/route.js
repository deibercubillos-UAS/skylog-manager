// Skylog V2.0 — F5 §100.540. Inicia un período de servicio/descanso/disponibilidad/
// entrenamiento para la persona autenticada. Ver docs/skylog-v2/41-tiempos-servicio.md.
//
// Bloqueo real (§7.2): iniciar 'servicio' se **rechaza** con 409 si (a) el mes o
// el día ya están en el límite de horas de vuelo, o (b) no pasó el descanso
// mínimo desde el último 'servicio' cerrado (§100.540(f)). 'descanso'/
// 'disponibilidad'/'entrenamiento' nunca se bloquean por estas reglas — son
// justamente lo que resuelve la situación, no lo que la causa.
import { createClientSSR } from '@/lib/supabaseServer';
import {
  resolveCurrentPerson,
  getOpenDutyPeriod,
  getLastClosedServicePeriod,
  getRecentFlights,
} from '@/lib/v2/duty';
import { checkMonthlyFlightHours, checkDailyFlightHours, checkRestPeriod, computeExamCompliance } from '@skylog/domain';

const VALID_TYPES = ['servicio', 'descanso', 'disponibilidad', 'entrenamiento'];

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
  const { organizationId, type } = body;
  if (!organizationId || !VALID_TYPES.includes(type)) {
    return Response.json({ error: 'organizationId y type (uno de: ' + VALID_TYPES.join(', ') + ') son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!organizationIds.includes(organizationId)) {
    return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });
  }

  // 100.540(f)(2)(iv) — el descanso no se fracciona; en general un solo período
  // abierto por persona a la vez evita solapamientos que no tendrían sentido físico.
  const { data: open, error: openError } = await getOpenDutyPeriod(supabase, personId);
  if (openError) return Response.json({ error: 'Error consultando períodos abiertos' }, { status: 500 });
  if (open) {
    return Response.json(
      { error: 'Ya existe un período abierto (' + open.type + ', desde ' + open.started_at + '). Ciérralo antes de iniciar otro.' },
      { status: 409 }
    );
  }

  if (type === 'servicio') {
    const now = new Date();

    const [{ data: lastService, error: lastServiceError }, { data: recentFlights, error: flightsError }] = await Promise.all([
      getLastClosedServicePeriod(supabase, personId),
      getRecentFlights(supabase, personId, 32),
    ]);
    if (lastServiceError || flightsError) {
      return Response.json({ error: 'Error verificando cumplimiento previo' }, { status: 500 });
    }

    // Bloqueo real por incumplimiento del examen de Capacitación (área propia,
    // /capacitacion) — un piloto que agotó sus intentos del ciclo vigente sin
    // aprobar no puede iniciar servicio, igual que producción bloquea el
    // despacho por examen reprobado/vencido. Nunca bloquea si la organización
    // no configuró examen (`not_configured` es compliant=true por diseño).
    const { data: examRow, error: examError } = await supabase
      .from('training_exams')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (examError) return Response.json({ error: 'Error verificando el examen de capacitación' }, { status: 500 });

    if (examRow) {
      const { data: attempts, error: attemptsError } = await supabase
        .from('training_exam_attempts')
        .select('cycle_start, passed')
        .eq('organization_id', organizationId)
        .eq('person_id', personId);
      if (attemptsError) return Response.json({ error: 'Error verificando los intentos del examen' }, { status: 500 });

      const examCompliance = computeExamCompliance(
        {
          recurrence: examRow.recurrence,
          recurrenceDays: examRow.recurrence_days,
          startDate: examRow.start_date,
          maxAttempts: examRow.max_attempts,
        },
        (attempts || []).map((a) => ({ cycleStart: a.cycle_start, passed: a.passed })),
        now
      );
      if (!examCompliance.compliant) {
        return Response.json(
          {
            error: 'Examen de Capacitación reprobado sin intentos disponibles en el ciclo vigente — no se puede iniciar servicio',
            examCompliance,
          },
          { status: 409 }
        );
      }
    }

    // Descanso mínimo desde el último servicio (§100.540(f)) — solo evaluable si
    // ya hubo un servicio cerrado antes; el primero de la historia no tiene nada
    // que comparar.
    if (lastService) {
      const serviceDurationHours =
        (new Date(lastService.ended_at).getTime() - new Date(lastService.started_at).getTime()) / 3_600_000;
      const restDurationHours = (now.getTime() - new Date(lastService.ended_at).getTime()) / 3_600_000;
      const rest = checkRestPeriod({ serviceDurationHours, restDurationHours });
      if (!rest.compliant) {
        return Response.json(
          { error: 'No ha pasado el descanso mínimo desde el último servicio (§100.540(f))', check: rest },
          { status: 409 }
        );
      }
    }

    // Vuelo mensual/diario ya en el límite — no tiene sentido habilitar más
    // servicio si el piloto ya no puede volar más este mes/día.
    const domainFlights = recentFlights.map((f) => ({
      personId,
      date: f.takeoff_at,
      totalTimeHours: Number(f.total_time),
      lineOfSight: f.visual_condition,
    }));
    const today = dayKey(now);
    const todayFlights = domainFlights.filter((f) => dayKey(new Date(f.date)) === today);
    const lineOfSight = todayFlights.some((f) => f.lineOfSight === 'BVLOS') ? 'BVLOS' : 'VLOS';
    const monthly = checkMonthlyFlightHours(domainFlights, { personId, month: monthKey(now) });
    const daily = checkDailyFlightHours(domainFlights, { personId, day: today, lineOfSight });
    if (!monthly.compliant || !daily.compliant) {
      return Response.json(
        { error: 'Ya se excedió un límite de horas de vuelo (§100.540) — no se puede iniciar más servicio', checks: { monthly, daily } },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from('duty_periods')
    .insert({
      organization_id: organizationId,
      person_id: personId,
      type,
      started_at: new Date().toISOString(),
      source: 'manual',
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ dutyPeriod: data });
}
