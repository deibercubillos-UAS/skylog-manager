// Skylog V2.0 — SMS-D: ocultar/mostrar una pregunta (oficial o propia) solo
// para esta organización — nunca borra el catálogo global, upsert por
// (organization_id, question_id).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function PATCH(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, hidden } = body;
  if (!organizationId || hidden == null) return Response.json({ error: 'organizationId y hidden son requeridos' }, { status: 400 });

  const { data: question, error: questionError } = await supabase.from('sms_gap_questions').select('id, organization_id').eq('id', id).maybeSingle();
  if (questionError) return Response.json({ error: questionError.message }, { status: 500 });
  if (!question) return Response.json({ error: 'Pregunta no encontrada' }, { status: 404 });
  if (question.organization_id && question.organization_id !== organizationId) {
    return Response.json({ error: 'Esta pregunta pertenece a otra organización' }, { status: 403 });
  }

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede ocultar/mostrar preguntas' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_gap_question_visibility')
    .upsert({ organization_id: organizationId, question_id: id, hidden: !!hidden }, { onConflict: 'organization_id,question_id' })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ visibility: data });
}
