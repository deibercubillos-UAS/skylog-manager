// Skylog V2.0 — Despacho. Carga TODO lo que hace falta para decidir si una misión se puede
// despachar y evalúa las verificaciones en un solo lugar. Lo usan la vista previa
// (GET /api/despacho/prepare) y la creación (POST /api/despacho): la creación RE-EVALÚA siempre,
// así que lo que el navegador haya visto no decide nada.
//
// Solo lectura. Devuelve { ok:false, status, error } en vez de lanzar, para que cada ruta responda
// con su propio formato.
import { createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, getOpenDutyPeriod } from '@/lib/v2/duty';
import { evaluateServiceGates } from '@/lib/v2/serviceGates';
import { buildDispatchGates, findRceCoverage, validateMatrixCompleteness } from '@skylog/domain';

/** 'YYYY-MM-DD' en hora de Colombia — a las 8 p. m. en Bogotá ya es "mañana" en UTC. */
export function bogotaDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date);
}

export async function loadDispatchContext(supabase, { userId, missionId, now = new Date() }) {
  const fail = (status, error) => ({ ok: false, status, error });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, userId);
  if (resolveError) return fail(500, 'No se pudo resolver la persona');
  if (!personId) return fail(404, 'Esta cuenta no tiene un registro de Persona vinculado todavía');

  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .select('*, aircraft:aircraft_id(id, serial_number, operational_status, model:model_id(brand, model))')
    .eq('id', missionId)
    .maybeSingle();
  if (missionError) return fail(500, 'Error consultando la misión');
  if (!mission) return fail(404, 'Misión no encontrada');
  if (!(memberships || []).some((m) => m.organization_id === mission.organization_id)) return fail(403, 'Sin membresía activa en la organización de esta misión');

  const organizationId = mission.organization_id;
  const today = bogotaDay(now);

  const { data: openPeriod, error: openError } = await getOpenDutyPeriod(supabase, personId);
  if (openError) return fail(500, 'Error consultando períodos abiertos');

  const service = await evaluateServiceGates(supabase, { organizationId, personId, now });
  if (service.error) return fail(500, service.error);

  // La póliza es OPCIONAL y nunca restringe el despacho: si la consulta falla por cualquier motivo
  // (tabla, permisos, llave de servicio), se omite el dato en vez de tumbar todo el despacho.
  // Solo la lee un gestor por RLS; el piloto necesita saber SI está cubierto, no los datos de la
  // póliza — por eso se consulta con service role y solo se devuelve el veredicto.
  let insurance = null;
  try {
    if (mission.aircraft_id) {
    const { data: rows, error: policyError } = await createAdminClient()
      .from('insurance_policies')
      .select('*, insurance_policy_aircraft(aircraft_id)')
      .eq('organization_id', organizationId);
    if (policyError) throw policyError;
    const policies = (rows || []).map(({ insurance_policy_aircraft, ...p }) => ({ ...p, aircraft_ids: (insurance_policy_aircraft || []).map((r) => r.aircraft_id) }));
    insurance = findRceCoverage(policies, { aircraftId: mission.aircraft_id, startDate: today, endDate: today });
    }
  } catch (e) {
    console.error('[despacho] verificación opcional de póliza omitida:', e?.message);
    insurance = null;
  }

  const { data: checklists, error: checklistError } = await supabase
    .from('checklists')
    .select('id, name, category, version, steps')
    .eq('organization_id', organizationId)
    .eq('category', 'Prevuelo')
    .order('name');
  if (checklistError) return fail(500, 'Error consultando las listas de chequeo');
  // Una lista sin pasos no aporta nada que diligenciar.
  const usableChecklists = (checklists || []).filter((c) => Array.isArray(c.steps) && c.steps.length > 0);

  const { data: matrix, error: matrixError } = await supabase.from('risk_matrices').select('*').eq('organization_id', organizationId).maybeSingle();
  if (matrixError) return fail(500, 'Error consultando la matriz de riesgo');
  const riskReady = !!matrix && validateMatrixCompleteness(matrix.probability_levels, matrix.severity_levels, matrix.tolerability).complete;

  const verdict = buildDispatchGates({
    mission,
    isPic: mission.pic_person_id === personId,
    missionDate: bogotaDay(new Date(mission.scheduled_at)),
    today,
    openPeriodType: openPeriod?.type || null,
    service: { rest: service.rest, monthly: service.monthly, daily: service.daily },
    exam: { compliant: service.examCompliance ? service.examCompliance.compliant : true },
    aircraft: { assigned: !!mission.aircraft_id, operationalStatus: mission.aircraft?.operational_status },
    insurance,
    checklistCount: usableChecklists.length,
    riskMatrixReady: riskReady,
  });

  return {
    ok: true,
    personId,
    organizationId,
    mission,
    checklists: usableChecklists,
    riskMatrix: riskReady ? { probabilityLevels: matrix.probability_levels, severityLevels: matrix.severity_levels, tolerability: matrix.tolerability } : null,
    openPeriodType: openPeriod?.type || null,
    ...verdict,
  };
}
