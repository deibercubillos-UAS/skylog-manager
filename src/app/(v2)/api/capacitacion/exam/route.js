// Skylog V2.0 — Área de Capacitación y Examen. Presentar el examen: GET sirve
// las preguntas SIN correct_index si la persona todavía tiene intentos
// disponibles en el ciclo vigente; POST califica server-side y registra el
// intento. Usa createAdminClient() (mismo patrón que producción,
// api/training/exam) porque training_exam_questions tiene RLS de
// solo-gestor — un piloto normal no puede leerla ni con el campo oculto.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { computeExamCompliance, gradeAttempt } from '@skylog/domain';

async function loadExamAndAttempts(admin, organizationId, personId) {
  const { data: exam } = await admin.from('training_exams').select('*').eq('organization_id', organizationId).maybeSingle();
  if (!exam) return { exam: null, attempts: [] };

  const { data: attempts } = await admin
    .from('training_exam_attempts')
    .select('cycle_start, passed')
    .eq('organization_id', organizationId)
    .eq('person_id', personId);

  return {
    exam: {
      recurrence: exam.recurrence,
      recurrenceDays: exam.recurrence_days,
      startDate: exam.start_date,
      maxAttempts: exam.max_attempts,
      passingScore: Number(exam.passing_score),
    },
    attempts: (attempts || []).map((a) => ({ cycleStart: a.cycle_start, passed: a.passed })),
    raw: exam,
  };
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const admin = createAdminClient();
  const { exam, attempts } = await loadExamAndAttempts(admin, organizationId, personId);
  const compliance = computeExamCompliance(exam, attempts);

  if (!exam || compliance.status !== 'pending') {
    return Response.json({ exam, compliance, questions: [] });
  }

  const { data: questions, error: questionsError } = await admin
    .from('training_exam_questions')
    .select('id, question, options, order_index')
    .eq('organization_id', organizationId)
    .order('order_index');
  if (questionsError) return Response.json({ error: questionsError.message }, { status: 500 });

  return Response.json({ exam, compliance, questions: questions || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, answers } = body;
  if (!organizationId || !Array.isArray(answers)) {
    return Response.json({ error: 'organizationId y answers (array) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const admin = createAdminClient();
  const { exam, attempts } = await loadExamAndAttempts(admin, organizationId, personId);
  if (!exam) return Response.json({ error: 'No hay examen configurado para esta organización' }, { status: 404 });

  // Elegibilidad recalculada server-side — nunca se confía en que el cliente
  // "sepa" que le quedan intentos.
  const compliance = computeExamCompliance(exam, attempts);
  if (compliance.status !== 'pending') {
    return Response.json({ error: 'No tiene intentos disponibles en el ciclo vigente', compliance }, { status: 409 });
  }

  const { data: questions, error: questionsError } = await admin
    .from('training_exam_questions')
    .select('correct_index')
    .eq('organization_id', organizationId)
    .order('order_index');
  if (questionsError) return Response.json({ error: questionsError.message }, { status: 500 });
  if (!questions?.length) return Response.json({ error: 'El examen no tiene preguntas configuradas' }, { status: 409 });

  const grading = gradeAttempt(
    questions.map((q) => ({ correctIndex: q.correct_index })),
    answers,
    exam.passingScore
  );

  const { data: attempt, error } = await admin
    .from('training_exam_attempts')
    .insert({
      organization_id: organizationId,
      person_id: personId,
      cycle_start: compliance.cycleStart,
      attempt_number: compliance.attemptsUsed + 1,
      answers,
      score: grading.score,
      passed: grading.passed,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ attempt, grading });
}
