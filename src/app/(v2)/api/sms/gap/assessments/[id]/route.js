// Skylog V2.0 — SMS-D: detalle de una autoevaluación GAP — todas sus
// respuestas + la evaluación inmediatamente anterior (si existe) para el
// comparativo automático (compareGapAssessments).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { computeGapStats, compareGapAssessments } from '@skylog/domain';

export async function GET(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: assessment, error } = await supabase.from('sms_gap_assessments').select('*').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!assessment) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(assessment.organization_id)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { data: responses, error: responsesError } = await supabase
    .from('sms_gap_responses')
    .select('*, question:question_id(component_number, component_name, element_number, element_name, question_text, order_index)')
    .eq('assessment_id', id)
    .order('order_index', { foreignTable: 'question' });
  if (responsesError) return Response.json({ error: responsesError.message }, { status: 500 });

  const stats = computeGapStats((responses || []).map((r) => ({ componentNumber: r.question?.component_number, response: r.response })));

  const { data: previousAssessment } = await supabase
    .from('sms_gap_assessments')
    .select('id')
    .eq('organization_id', assessment.organization_id)
    .lt('assessment_date', assessment.assessment_date)
    .order('assessment_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  let comparison = { totalDelta: null, byComponentDelta: {} };
  if (previousAssessment) {
    const { data: previousResponses } = await supabase
      .from('sms_gap_responses')
      .select('response, question:question_id(component_number)')
      .eq('assessment_id', previousAssessment.id);
    const previousStats = computeGapStats((previousResponses || []).map((r) => ({ componentNumber: r.question?.component_number, response: r.response })));
    comparison = compareGapAssessments(stats, previousStats);
  }

  return Response.json({ assessment, responses: responses || [], stats, comparison });
}

export async function DELETE(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: assessment, error: fetchError } = await supabase.from('sms_gap_assessments').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!assessment) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, assessment.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar una autoevaluación GAP' }, { status: 403 });
  }

  const { error } = await supabase.from('sms_gap_assessments').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
