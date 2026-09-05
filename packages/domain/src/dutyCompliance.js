// dutyCompliance — RAC 100 §100.540 (tiempos de servicio, vuelo y descanso).
// Lógica pura: recibe datos ya cargados (duty_periods, flights) y devuelve un
// veredicto de cumplimiento por regla. No consulta Supabase ni conoce la forma
// exacta de las tablas reales — solo los campos que cada función necesita.
// Fuente: docs/skylog-v2/41-tiempos-servicio.md §1.1.

export const DUTY_LIMITS = {
  monthlyFlightHours: 90,              // 100.540(c)(1)
  dailyFlightHoursBvlos: 6,            // 100.540(d)(1)(i)
  dailyFlightHoursVlosEvlos: 8,        // 100.540(d)(1)(ii)
  continuousOperationHours: 2,         // 100.540(e)
  continuousOperationRestMinutes: 30,  // 100.540(e)
  shortServiceThresholdHours: 8,       // umbral que decide 10h vs 12h de descanso
  restAfterShortServiceHours: 10,      // 100.540(f)(2)(i)
  restAfterLongServiceHours: 12,       // 100.540(f)(2)(ii)
};

function hoursBetween(startedAt, endedAt) {
  return (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 3_600_000;
}

function monthKey(dateLike) {
  const d = new Date(dateLike);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function dayKey(dateLike) {
  return new Date(dateLike).toISOString().slice(0, 10);
}

// 100.540(c)(1) — vuelo efectivo ≤ 90h por mes calendario.
// `flights`: [{ personId, date, totalTimeHours }]. `month`: 'YYYY-MM'.
export function checkMonthlyFlightHours(flights, { personId, month }) {
  const hours = flights
    .filter((f) => f.personId === personId && monthKey(f.date) === month)
    .reduce((sum, f) => sum + f.totalTimeHours, 0);
  const limit = DUTY_LIMITS.monthlyFlightHours;
  return {
    rule: '100.540(c)(1)',
    hours,
    limit,
    compliant: hours <= limit,
    warning: hours < limit && hours >= limit * 0.8,
  };
}

// 100.540(d)(1) — vuelo máximo por 24h, según línea de vista (VLOS/EVLOS vs. BVLOS).
// `day`: 'YYYY-MM-DD'. `lineOfSight`: 'VLOS' | 'EVLOS' | 'BVLOS'.
export function checkDailyFlightHours(flights, { personId, day, lineOfSight }) {
  const limit =
    lineOfSight === 'BVLOS'
      ? DUTY_LIMITS.dailyFlightHoursBvlos
      : DUTY_LIMITS.dailyFlightHoursVlosEvlos;
  const hours = flights
    .filter((f) => f.personId === personId && dayKey(f.date) === day)
    .reduce((sum, f) => sum + f.totalTimeHours, 0);
  return {
    rule: lineOfSight === 'BVLOS' ? '100.540(d)(1)(i)' : '100.540(d)(1)(ii)',
    hours,
    limit,
    compliant: hours <= limit,
  };
}

// 100.540(e) — operación continua ≤ 2h; superado ese umbral, exige ≥30min de
// descanso antes del siguiente período de servicio.
// `dutyPeriods`: [{ personId, type, startedAt, endedAt }], ordenados o no.
export function checkContinuousOperation(dutyPeriods, { personId }) {
  const periods = dutyPeriods
    .filter((p) => p.personId === personId && p.type === 'servicio')
    .slice()
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

  const violations = [];
  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const duration = hoursBetween(period.startedAt, period.endedAt);
    if (duration <= DUTY_LIMITS.continuousOperationHours) continue;

    const next = periods[i + 1];
    const restMinutes = next
      ? (new Date(next.startedAt).getTime() - new Date(period.endedAt).getTime()) / 60_000
      : null;

    if (restMinutes === null || restMinutes < DUTY_LIMITS.continuousOperationRestMinutes) {
      violations.push({ period, durationHours: duration, restMinutes });
    }
  }

  return {
    rule: '100.540(e)',
    compliant: violations.length === 0,
    violations,
  };
}

// 100.540(f)(2)(i-iv) — descanso tras un período de servicio: duración mínima
// según si el servicio fue ≤8h o >8h, nunca menor al servicio anterior, y
// nunca fraccionado.
export function checkRestPeriod({ serviceDurationHours, restDurationHours, isFractioned = false }) {
  const requiredHours =
    serviceDurationHours <= DUTY_LIMITS.shortServiceThresholdHours
      ? DUTY_LIMITS.restAfterShortServiceHours
      : DUTY_LIMITS.restAfterLongServiceHours;

  const violations = [];
  if (restDurationHours < requiredHours) {
    violations.push({
      rule: serviceDurationHours <= DUTY_LIMITS.shortServiceThresholdHours
        ? '100.540(f)(2)(i)'
        : '100.540(f)(2)(ii)',
      requiredHours,
      actualHours: restDurationHours,
    });
  }
  if (restDurationHours < serviceDurationHours) {
    violations.push({
      rule: '100.540(f)(2)(iii)',
      message: 'El descanso no puede ser inferior al servicio inmediatamente anterior',
    });
  }
  if (isFractioned) {
    violations.push({
      rule: '100.540(f)(2)(iv)',
      message: 'El descanso está fraccionado — prohibido',
    });
  }

  return {
    requiredHours,
    compliant: violations.length === 0,
    violations,
  };
}

// Agregador — evalúa el conjunto de reglas aplicables para una persona en un
// contexto de despacho dado. `rest` es null si no hay datos de servicio/
// descanso todavía (esa regla simplemente no participa en `blocksDispatch`).
export function evaluateDutyCompliance(
  { dutyPeriods = [], flights = [] },
  { personId, month, day, lineOfSight, serviceDurationHours, restDurationHours, isFractioned }
) {
  const checks = {
    monthlyFlight: checkMonthlyFlightHours(flights, { personId, month }),
    dailyFlight: checkDailyFlightHours(flights, { personId, day, lineOfSight }),
    continuousOperation: checkContinuousOperation(dutyPeriods, { personId }),
    rest:
      serviceDurationHours != null && restDurationHours != null
        ? checkRestPeriod({ serviceDurationHours, restDurationHours, isFractioned })
        : null,
  };

  const blocksDispatch = Object.values(checks).some((c) => c && c.compliant === false);

  return { personId, checks, blocksDispatch };
}
