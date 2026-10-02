// Skylog V2.0 — Capacitación: banco de preguntas de una evaluación puntual
// (`capacitacion_evaluation_questions`) — cada evaluación tiene su propio
// banco (a pedido explícito del usuario: "diferentes bancos de preguntas
// dependiendo del material de apoyo"), a diferencia del banco único por
// pista del modelo anterior (decisión 55). RLS exige gestor incluso para
// SELECT — `correct_index` nunca debe llegar a quien presenta el examen.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

async function loadEvaluationOrg(supabase, evaluationId) {
  return supabase.from('capacitacion_evaluations').select('organization_id').eq('id', evaluationId).maybeSingle();
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { evaluationId, question, options, correctIndex, orderIndex } = body;
  if (!evaluationId || !question || !Array.isArray(options) || options.length < 2 || correctIndex == null) {
    return Response.json({ error: 'evaluationId, question, options (≥2) y correctIndex son requeridos' }, { status: 400 });
  }
  if (correctIndex < 0 || correctIndex >= options.length) {
    return Response.json({ error: 'correctIndex debe apuntar a una opción real' }, { status: 400 });
  }

  const { data: evaluation, error: evalError } = await loadEvaluationOrg(supabase, evaluationId);
  if (evalError) return Response.json({ error: evalError.message }, { status: 500 });
  if (!evaluation) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, evaluation.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede administrar el banco de preguntas' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('capacitacion_evaluation_questions')
    .insert({
      evaluation_id: evaluationId,
      question,
      options,
      correct_index: correctIndex,
      order_index: orderIndex ?? 0,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ question: data });
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

  // RLS ya restringe SELECT a gestores — si un no-gestor llama esto, recibe
  // lista vacía (no error), coherente con el resto del proyecto.
  const { data, error } = await supabase.from('capacitacion_evaluation_questions').select('*').eq('evaluation_id', evaluationId).order('order_index');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ questions: data });
}

export async function DELETE(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase
    .from('capacitacion_evaluation_questions')
    .select('evaluation_id, capacitacion_evaluations(organization_id)')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Pregunta no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.capacitacion_evaluations?.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede administrar el banco de preguntas' }, { status: 403 });
  }

  const { error } = await supabase.from('capacitacion_evaluation_questions').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
