// Skylog V2.0 — F4a. Checklist de preparación de una solicitud de autorización.
// Ítems: póliza RCE (§100.805(a)(1) y §100.410(a)(2)(i)), CDO-U vigente, antelación
// (15/10 días hábiles) y aeronaves con registro (RUAS). Es informativo — NO bloquea firmar el análisis de
// riesgos ni radicar: avisa lo que falta, igual que el aviso de conflicto de
// agenda. La evaluación vive en packages/domain (evaluateRceForAuthorization);
// aquí solo se cargan los datos. Solo gestores, porque las pólizas lo son.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { evaluateRceForAuthorization, evaluateCdoForAuthorization, evaluateLeadTime, evaluateAircraftRegistration } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const authorizationId = new URL(request.url).searchParams.get('authorizationId');
  if (!authorizationId) return Response.json({ error: 'authorizationId es requerido' }, { status: 400 });

  const { data: authRequest, error: reqError } = await supabase
    .from('authorization_requests')
    .select('id, organization_id, scope_start, scope_end')
    .eq('id', authorizationId)
    .maybeSingle();
  if (reqError) return Response.json({ error: reqError.message }, { status: 500 });
  if (!authRequest) return Response.json({ error: 'Solicitud no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, authRequest.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede ver la preparación del expediente' }, { status: 403 });
  }

  const [{ data: rows, error: policyError }, { data: aircraft, error: aircraftError }, { data: cert }] = await Promise.all([
    supabase.from('insurance_policies').select('*, insurance_policy_aircraft(aircraft_id)').eq('organization_id', authRequest.organization_id),
    supabase
      .from('aircraft')
      .select('id, serial_number, ruas_number, operational_status, model:model_id(brand, model)')
      .eq('organization_id', authRequest.organization_id),
    supabase.from('organization_certifications').select('cdo_number, expires_at').eq('organization_id', authRequest.organization_id).maybeSingle(),
  ]);
  if (policyError || aircraftError) return Response.json({ error: 'Error consultando pólizas o flota' }, { status: 500 });

  const policies = (rows || []).map(({ insurance_policy_aircraft, ...p }) => ({
    ...p,
    aircraft_ids: (insurance_policy_aircraft || []).map((r) => r.aircraft_id),
  }));

  const rce = evaluateRceForAuthorization(policies, aircraft || [], {
    startDate: authRequest.scope_start,
    endDate: authRequest.scope_end,
  });

  // El panel necesita nombres legibles, no solo ids.
  const labels = Object.fromEntries((aircraft || []).map((a) => [a.id, `${a.model?.brand || ''} ${a.model?.model || ''} · ${a.serial_number}`.trim()]));
  const policyLabels = Object.fromEntries(policies.map((p) => [p.id, `${p.insurer} · ${p.policy_number}`]));

  const today = bogotaDay(new Date());
  const period = { startDate: authRequest.scope_start, endDate: authRequest.scope_end };
  const registration = evaluateAircraftRegistration(aircraft || []);

  return Response.json({
    cdo: evaluateCdoForAuthorization(cert, period, today),
    leadTime: evaluateLeadTime({ scopeStart: authRequest.scope_start }, today),
    registration: { ...registration, missingLabels: registration.missing.map((id) => labels[id]) },
    rce: {
      ...rce,
      byAircraft: rce.byAircraft.map((x) => ({ ...x, label: labels[x.aircraftId], policyLabel: x.policyId ? policyLabels[x.policyId] : null })),
      missingDocumentLabels: rce.missingDocument.map((id) => policyLabels[id]),
    },
  });
}
