// Skylog V2.0 — F3. Progreso del asistente de implantación (40-sms.md §5.2).
// Agrega datos reales de todas las piezas de F3 ya construidas — nunca
// fabrica ni asume estado; GAP/MSMS (sin construir todavía en V2) llegan
// explícitamente `false` al dominio, así que la fase 3/4/5 nunca se marcan
// completas hasta que existan de verdad.
import { createClientSSR } from '@/lib/supabaseServer';
import { computeImplementationProgress } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const [gsoRes, policyRes, matrixRes, hazardsRes, indicatorsRes, sessionsRes] = await Promise.all([
    supabase.from('designations').select('id').eq('organization_id', organizationId).eq('role_type', 'gerente_sms').is('ended_at', null).maybeSingle(),
    supabase.from('sms_policies').select('id').eq('organization_id', organizationId).not('signed_at', 'is', null).limit(1).maybeSingle(),
    supabase.from('risk_matrices').select('tolerability').eq('organization_id', organizationId).maybeSingle(),
    supabase.from('hazards').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase.from('safety_indicator_monthly').select('indicator_id').eq('organization_id', organizationId),
    supabase.from('sms_training_attendance').select('session_id').eq('organization_id', organizationId),
  ]);

  const errors = [gsoRes, policyRes, matrixRes, hazardsRes, indicatorsRes, sessionsRes].map((r) => r.error).filter(Boolean);
  if (errors.length) return Response.json({ error: errors[0].message }, { status: 500 });

  // Indicadores con ≥3 meses de datos (§5.2 fase 3: "≥3 SPI activos con datos
  // de al menos 3 meses") — cuenta cuántos meses distintos tiene cada uno.
  const monthsByIndicator = {};
  for (const row of indicatorsRes.data || []) {
    monthsByIndicator[row.indicator_id] = (monthsByIndicator[row.indicator_id] || 0) + 1;
  }
  const indicatorsWithThreeMonthsData = Object.values(monthsByIndicator).filter((n) => n >= 3).length;

  const progress = computeImplementationProgress({
    gsoDesignated: !!gsoRes.data,
    policySigned: !!policyRes.data,
    riskMatrixConfigured: !!matrixRes.data && Array.isArray(matrixRes.data.tolerability) && matrixRes.data.tolerability.length > 0,
    hazardsCount: hazardsRes.count || 0,
    indicatorsWithThreeMonthsData,
    // GAP y MSMS todavía no existen como entidades en V2 (40-sms.md §5.2
    // fases 3/4, deliberadamente diferido — ver 51-bitacora.md) — se
    // declaran explícitamente en false, nunca se asumen cumplidos.
    gapAssessmentCompleted: false,
    trainingSessionsWithAttendance: new Set((sessionsRes.data || []).map((r) => r.session_id)).size,
    msmsPublished: false,
  });

  return Response.json({ progress });
}
