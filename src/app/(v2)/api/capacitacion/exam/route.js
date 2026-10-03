// Skylog V2.0 — Capacitación: presentar una evaluación puntual. GET sirve
// las preguntas SIN correct_index si la persona todavía puede intentarlo
// (pending/overdue con intentos disponibles); POST califica server-side y
// registra el intento. Usa createAdminClient() porque
// capacitacion_evaluation_questions tiene RLS de solo-gestor — un piloto
// normal no puede leerla ni con el campo oculto (mismo patrón que la
// decisión 55 con training_exam_questions).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { computeEvaluationCompliance, gradeAttempt, classifyReportRoute } from '@skylog/domain';

// ⚠️ `organizationIds` NO es opcional: al leer con service role (ver cabecera)
// RLS no acota nada, así que el filtro por organización es el único límite
// multi-tenant que queda. Va dentro de la consulta a propósito — una
// evaluación de otra organización se comporta como inexistente (404) en vez
// de 403, sin filtrar ni que el id exista.
async function loadEvaluationAndAttempts(admin, evaluationId, personId, organizationIds) {
  const { data: evaluation } = await admin
    .from('capacitacion_evaluations')
    .select('*')
    .eq('id', evaluationId)
    .in('organization_id', organizationIds)
    .maybeSingle();
  if (!evaluation) return { evaluation: null, attempts: [] };

  const { data: attempts } = await admin
    .from('capacitacion_evaluation_attempts')
    .select('passed')
    .eq('evaluation_id', evaluationId)
    .eq('person_id', personId);

  return {
    evaluation: { id: evaluation.id, dueDate: evaluation.due_date, maxAttempts: evaluation.max_attempts, passingScore: Number(evaluation.passing_score) },
    attempts: attempts || [],
    raw: evaluation,
  };
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const evaluationId = searchParams.get('evaluationId');
  if (!evaluationId) return Response.json({ error: 'evaluationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const admin = createAdminClient();
  const { evaluation, attempts } = await loadEvaluationAndAttempts(admin, evaluationId, personId, organizationIds);
  if (!evaluation) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const compliance = computeEvaluationCompliance(evaluation, attempts);
  if (compliance.status !== 'pending' && compliance.status !== 'overdue') {
    return Response.json({ compliance, questions: [] });
  }

  const { data: questions, error: questionsError } = await admin
    .from('capacitacion_evaluation_questions')
    .select('id, question, options, order_index')
    .eq('evaluation_id', evaluationId)
    .order('order_index');
  if (questionsError) return Response.json({ error: questionsError.message }, { status: 500 });

  return Response.json({ compliance, questions: questions || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { evaluationId, answers } = body;
  if (!evaluationId || !Array.isArray(answers)) {
    return Response.json({ error: 'evaluationId y answers (array) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const admin = createAdminClient();
  const { evaluation, attempts, raw } = await loadEvaluationAndAttempts(admin, evaluationId, personId, organizationIds);
  if (!evaluation) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  // Elegibilidad recalculada server-side — nunca se confía en que el cliente
  // "sepa" que le quedan intentos.
  const compliance = computeEvaluationCompliance(evaluation, attempts);
  if (compliance.status !== 'pending' && compliance.status !== 'overdue') {
    return Response.json({ error: 'No tiene intentos disponibles para esta evaluación', compliance }, { status: 409 });
  }

  const { data: questions, error: questionsError } = await admin
    .from('capacitacion_evaluation_questions')
    .select('correct_index')
    .eq('evaluation_id', evaluationId)
    .order('order_index');
  if (questionsError) return Response.json({ error: questionsError.message }, { status: 500 });
  if (!questions?.length) return Response.json({ error: 'La evaluación no tiene preguntas configuradas' }, { status: 409 });

  const grading = gradeAttempt(
    questions.map((q) => ({ correctIndex: q.correct_index })),
    answers,
    evaluation.passingScore
  );

  const { data: attempt, error } = await admin
    .from('capacitacion_evaluation_attempts')
    .insert({
      evaluation_id: evaluationId,
      organization_id: raw.organization_id,
      person_id: personId,
      attempt_number: compliance.attemptsUsed + 1,
      answers,
      score: grading.score,
      passed: grading.passed,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // SMS-E — "SMS alimentado por la operación" (40-sms.md §5.4/§5.9): un
  // examen reprobado es un hallazgo real de competencia del personal — se
  // convierte solo en un BORRADOR de reporte SMS, nunca radicado. Fire-and-
  // forget, mismo patrón que la decisión 50/SMS-E (eventos inesperados).
  if (!grading.passed) {
    try {
      const membership = (memberships || []).find((m) => m.organization_id === raw.organization_id);
      const route = classifyReportRoute({ severity: 'incidente', reportedByRole: membership?.role });
      await admin.from('sms_reports').insert({
        organization_id: raw.organization_id,
        reported_by: personId,
        severity: 'incidente',
        route: route.route,
        requires_manager_analysis: route.requiresManagerAnalysis,
        event_code: 'EVT-TRNFAIL',
        description: `Borrador automático — examen de capacitación "${raw.title}" reprobado (${grading.score.toFixed(0)}% / mínimo ${evaluation.passingScore}%).`,
        source: 'auto_training_exam_failed',
      });
    } catch {
      // silencioso — el intento ya se guardó, el borrador SMS es un efecto
      // secundario informativo.
    }
  }

  return Response.json({ attempt, grading });
}
