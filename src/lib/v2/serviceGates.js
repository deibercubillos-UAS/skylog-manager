// Skylog V2.0 — verificaciones previas a iniciar SERVICIO de una persona (RAC 100 §100.540 +
// examen de Capacitación). Antes vivían inline en POST /api/duty/start; se extraen aquí para que
// el Despacho (/api/despacho) y el inicio manual de servicio apliquen EXACTAMENTE la misma
// lógica y no puedan divergir. Solo lectura: no escribe nada.
//
// Devuelve cada verificación por separado (no un booleano) porque quien llama necesita el
// detalle para su propio mensaje: el inicio de servicio responde 409 con el cuerpo de la
// verificación que falló; el Despacho las convierte en gates.
import { getLastClosedServicePeriod, getRecentFlights } from '@/lib/v2/duty';
import { checkMonthlyFlightHours, checkDailyFlightHours, checkRestPeriod, computeExamCompliance, dayKey, monthKey } from '@skylog/domain';

/**
 * @returns {Promise<{ error: string|null, examCompliance: object|null, rest: object|null, monthly: object, daily: object }>}
 *  - examCompliance: null si la organización no configuró examen (nunca bloquea).
 *  - rest: null si la persona nunca cerró un servicio (no hay con qué comparar).
 */
export async function evaluateServiceGates(supabase, { organizationId, personId, now = new Date() }) {
  const [{ data: lastService, error: lastServiceError }, { data: recentFlights, error: flightsError }] = await Promise.all([
    getLastClosedServicePeriod(supabase, personId),
    getRecentFlights(supabase, personId, 32),
  ]);
  if (lastServiceError || flightsError) return { error: 'Error verificando cumplimiento previo' };

  // Un piloto que agotó los intentos del ciclo vigente sin aprobar no puede iniciar servicio.
  // Si la organización no configuró examen, `not_configured` es compliant=true por diseño.
  const { data: examRow, error: examError } = await supabase.from('training_exams').select('*').eq('organization_id', organizationId).maybeSingle();
  if (examError) return { error: 'Error verificando el examen de capacitación' };

  let examCompliance = null;
  if (examRow) {
    const { data: attempts, error: attemptsError } = await supabase
      .from('training_exam_attempts')
      .select('cycle_start, passed')
      .eq('organization_id', organizationId)
      .eq('person_id', personId);
    if (attemptsError) return { error: 'Error verificando los intentos del examen' };

    examCompliance = computeExamCompliance(
      { recurrence: examRow.recurrence, recurrenceDays: examRow.recurrence_days, startDate: examRow.start_date, maxAttempts: examRow.max_attempts },
      (attempts || []).map((a) => ({ cycleStart: a.cycle_start, passed: a.passed })),
      now
    );
  }

  // Descanso mínimo desde el último servicio cerrado (§100.540(f)).
  let rest = null;
  if (lastService) {
    const serviceDurationHours = (new Date(lastService.ended_at).getTime() - new Date(lastService.started_at).getTime()) / 3_600_000;
    const restDurationHours = (now.getTime() - new Date(lastService.ended_at).getTime()) / 3_600_000;
    rest = checkRestPeriod({ serviceDurationHours, restDurationHours });
  }

  // Horas de vuelo del mes y del día: no tiene sentido habilitar más servicio si ya no puede volar más.
  const domainFlights = recentFlights.map((f) => ({ personId, date: f.takeoff_at, totalTimeHours: Number(f.total_time), lineOfSight: f.visual_condition }));
  const today = dayKey(now);
  const todayFlights = domainFlights.filter((f) => dayKey(new Date(f.date)) === today);
  const lineOfSight = todayFlights.some((f) => f.lineOfSight === 'BVLOS') ? 'BVLOS' : 'VLOS';
  const monthly = checkMonthlyFlightHours(domainFlights, { personId, month: monthKey(now) });
  const daily = checkDailyFlightHours(domainFlights, { personId, day: today, lineOfSight });

  return { error: null, examCompliance, rest, monthly, daily };
}
