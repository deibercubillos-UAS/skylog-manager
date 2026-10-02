// Skylog V2.0 — Capacitación: estado de cumplimiento por pista, ahora sobre
// varias evaluaciones a través del tiempo (`capacitacion_evaluations`) en
// vez de un examen recurrente único. `type` sigue siendo requerido — cada
// pista agrupa sus propias evaluaciones.
//
// Siempre devuelve `compliances` (el cumplimiento propio del solicitante,
// evaluación por evaluación) — la página del piloto lo usa para mostrar
// cada evaluación con su propio estado. Si además es gestor, agrega
// `roster` (por cada miembro, la evaluación que lo bloquea ahora —
// `personEvaluationStatus`) — corrige una limitación documentada en la
// decisión 121 (antes un gestor nunca veía su propio cumplimiento, solo el
// roster). `_ComplianceRoster.js` sigue consumiendo `roster` sin cambios.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { TRAINING_TYPES } from '@/lib/v2/training';
import { computeEvaluationCompliance, personEvaluationStatus } from '@skylog/domain';

function toDomainEvaluation(row) {
  return { id: row.id, dueDate: row.due_date, maxAttempts: row.max_attempts };
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const type = searchParams.get('type');
  if (!organizationId || !type) return Response.json({ error: 'organizationId y type son requeridos' }, { status: 400 });
  if (!TRAINING_TYPES.includes(type)) return Response.json({ error: 'type inválido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: evaluationRows, error: evalError } = await supabase
    .from('capacitacion_evaluations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('type', type)
    .order('due_date');
  if (evalError) return Response.json({ error: evalError.message }, { status: 500 });

  const evaluations = (evaluationRows || []).map(toDomainEvaluation);
  const evaluationIds = evaluations.length ? evaluations.map((e) => e.id) : ['00000000-0000-0000-0000-000000000000'];

  const { data: myAttempts, error: myAttemptsError } = await supabase
    .from('capacitacion_evaluation_attempts')
    .select('evaluation_id, passed')
    .eq('organization_id', organizationId)
    .eq('person_id', personId)
    .in('evaluation_id', evaluationIds);
  if (myAttemptsError) return Response.json({ error: myAttemptsError.message }, { status: 500 });

  const compliances = {};
  for (const evaluation of evaluations) {
    const attempts = (myAttempts || []).filter((a) => a.evaluation_id === evaluation.id).map((a) => ({ passed: a.passed }));
    compliances[evaluation.id] = computeEvaluationCompliance(evaluation, attempts);
  }

  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ evaluations: evaluationRows, compliances });
  }

  const { data: orgMembers, error: membersError } = await supabase
    .from('memberships')
    .select('person_id, people(full_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'activa');
  if (membersError) return Response.json({ error: membersError.message }, { status: 500 });

  const { data: allAttempts, error: attemptsError } = await supabase
    .from('capacitacion_evaluation_attempts')
    .select('evaluation_id, person_id, passed')
    .eq('organization_id', organizationId)
    .in('evaluation_id', evaluationIds);
  if (attemptsError) return Response.json({ error: attemptsError.message }, { status: 500 });

  const roster = (orgMembers || []).map((m) => {
    const attemptsByEvaluationId = new Map();
    (allAttempts || [])
      .filter((a) => a.person_id === m.person_id)
      .forEach((a) => {
        if (!attemptsByEvaluationId.has(a.evaluation_id)) attemptsByEvaluationId.set(a.evaluation_id, []);
        attemptsByEvaluationId.get(a.evaluation_id).push({ passed: a.passed });
      });
    const { compliance } = personEvaluationStatus(evaluations, attemptsByEvaluationId);
    return { personId: m.person_id, fullName: m.people?.full_name || m.person_id, compliance };
  });

  return Response.json({ evaluations: evaluationRows, compliances, roster });
}
