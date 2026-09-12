// Skylog V2.0 — helpers de F5 (tiempos de servicio, RAC 100 §100.540).
// Solo lectura/escritura de datos + resolución de identidad; el cumplimiento
// normativo en sí vive en packages/domain (dutyCompliance.js), sin Supabase.
// Ver docs/skylog-v2/41-tiempos-servicio.md · 31-esquema-datos.md §1, §3.1.

/**
 * Resuelve { personId, organizationIds } de la sesión autenticada actual vía
 * accounts.auth_user_id → memberships activas. Ninguna de las dos tablas
 * existía en v1 — son el modelo de identidad nuevo de V2 (30-entidades.md §2).
 */
export async function resolveCurrentPerson(supabase, userId) {
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, person_id')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (accountError) return { error: accountError };
  if (!account) return { error: null, personId: null, organizationIds: [] };

  const { data: memberships, error: membershipError } = await supabase
    .from('memberships')
    .select('organization_id, role')
    .eq('person_id', account.person_id)
    .eq('status', 'activa');

  if (membershipError) return { error: membershipError };

  return {
    error: null,
    personId: account.person_id,
    organizationIds: (memberships || []).map((m) => m.organization_id),
    memberships: memberships || [],
  };
}

export function isDutyManager(memberships, organizationId) {
  return (memberships || []).some(
    (m) => m.organization_id === organizationId && ['admin', 'jefe_pilotos', 'gerente_sms', 'superadmin'].includes(m.role)
  );
}

/** Período de servicio/descanso/etc. abierto (ended_at is null) de una persona. */
export async function getOpenDutyPeriod(supabase, personId) {
  const { data, error } = await supabase
    .from('duty_periods')
    .select('*')
    .eq('person_id', personId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

/** Períodos de una persona en los últimos `days` días — insumo para dutyCompliance. */
export async function getRecentDutyPeriods(supabase, personId, days = 32) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('duty_periods')
    .select('*')
    .eq('person_id', personId)
    .gte('started_at', since)
    .order('started_at', { ascending: true });
  return { data: data || [], error };
}

/** Último período 'servicio' ya cerrado de una persona — insumo para el chequeo
 * de descanso (checkRestPeriod, §100.540(f)) antes de permitir iniciar otro. */
export async function getLastClosedServicePeriod(supabase, personId) {
  const { data, error } = await supabase
    .from('duty_periods')
    .select('*')
    .eq('person_id', personId)
    .eq('type', 'servicio')
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

/** Vuelos de una persona en los últimos `days` días — insumo para dutyCompliance
 * (checkMonthlyFlightHours/checkDailyFlightHours filtran por mes/día internamente). */
export async function getRecentFlights(supabase, personId, days = 32) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('flights')
    .select('*')
    .eq('pilot_person_id', personId)
    .gte('takeoff_at', since)
    .order('takeoff_at', { ascending: true });
  return { data: data || [], error };
}
