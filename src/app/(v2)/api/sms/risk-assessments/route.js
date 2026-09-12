// Skylog V2.0 — F3. Evaluación probabilidad/severidad/mitigación/residual de
// un peligro, contra la matriz de riesgo YA CONFIGURADA de la organización
// (risk_matrices — regla C3). `initial_zone`/`residual_zone` se calculan
// server-side con evaluateInternalHazard() — nunca se confía en el valor que
// mande el cliente (regla S2).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { evaluateInternalHazard } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { hazardId, probabilityCode, severityCode, mitigation, residualProbabilityCode, residualSeverityCode } = body;
  if (!hazardId || probabilityCode == null || !severityCode) {
    return Response.json({ error: 'hazardId, probabilityCode y severityCode son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: hazard, error: hazardError } = await supabase
    .from('hazards')
    .select('id, organization_id')
    .eq('id', hazardId)
    .maybeSingle();
  if (hazardError) return Response.json({ error: 'Error verificando el peligro' }, { status: 500 });
  if (!hazard) return Response.json({ error: 'Peligro no encontrado' }, { status: 404 });
  if (!isDutyManager(memberships, hazard.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede evaluar un peligro' }, { status: 403 });
  }

  const { data: matrix, error: matrixError } = await supabase
    .from('risk_matrices')
    .select('tolerability')
    .eq('organization_id', hazard.organization_id)
    .maybeSingle();
  if (matrixError) return Response.json({ error: 'Error leyendo la matriz de riesgo' }, { status: 500 });
  if (!matrix) return Response.json({ error: 'Esta organización todavía no configuró su matriz de riesgo (POST /api/sms/risk-matrix)' }, { status: 409 });

  const evaluation = evaluateInternalHazard({
    tolerability: matrix.tolerability,
    probabilityCode,
    severityCode,
    residualProbabilityCode,
    residualSeverityCode,
  });
  if (!evaluation.configured) {
    return Response.json({ error: 'La combinación evaluada no tiene una celda configurada en la matriz de riesgo' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('risk_assessments')
    .insert({
      hazard_id: hazardId,
      organization_id: hazard.organization_id,
      probability_code: probabilityCode,
      severity_code: severityCode,
      initial_zone: evaluation.initialZone,
      mitigation: mitigation || null,
      residual_probability_code: residualProbabilityCode || null,
      residual_severity_code: residualSeverityCode || null,
      residual_zone: evaluation.residualZone,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ riskAssessment: data });
}
