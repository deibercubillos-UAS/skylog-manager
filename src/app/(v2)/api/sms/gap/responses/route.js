// Skylog V2.0 — SMS-D: respuestas de una autoevaluación GAP — upsert en
// bloque (el usuario va marcando Sí/No ítem por ítem, sin exigir responder
// el 100% para guardar — mismo criterio que la autoevaluación GAP de v1).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { assessmentId, responses } = body;
  if (!assessmentId || !Array.isArray(responses) || !responses.length) {
    return Response.json({ error: 'assessmentId y responses[] son requeridos' }, { status: 400 });
  }

  const { data: assessment, error: fetchError } = await supabase.from('sms_gap_assessments').select('organization_id').eq('id', assessmentId).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!assessment) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, assessment.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede diligenciar la autoevaluación GAP' }, { status: 403 });
  }

  const rows = responses
    .filter((r) => r.questionId && ['si', 'no'].includes(r.response))
    .map((r) => ({
      organization_id: assessment.organization_id,
      assessment_id: assessmentId,
      question_id: r.questionId,
      response: r.response,
      evidence_date: r.evidenceDate || null,
      comments: r.comments?.trim() || null,
      responsible: r.responsible?.trim() || null,
      status: ['pendiente', 'en_progreso', 'completado'].includes(r.status) ? r.status : 'pendiente',
      updated_at: new Date().toISOString(),
    }));
  if (!rows.length) return Response.json({ error: 'Ninguna respuesta válida' }, { status: 400 });

  const { data, error } = await supabase.from('sms_gap_responses').upsert(rows, { onConflict: 'assessment_id,question_id' }).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await supabase.from('sms_gap_assessments').update({ updated_at: new Date().toISOString() }).eq('id', assessmentId);

  return Response.json({ responses: data });
}
