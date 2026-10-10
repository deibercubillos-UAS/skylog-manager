// Skylog V2.0 — SMS-D: editar/eliminar una pregunta PROPIA de la org
// (componente 5). Nunca una oficial — un intento sobre una fila con
// organization_id null responde 404, mismo criterio ya usado en v1.
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

  const { data: question, error: fetchError } = await supabase.from('sms_gap_questions').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!question || !question.organization_id) return Response.json({ error: 'Pregunta no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, question.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar preguntas propias' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { elementNumber, elementName, questionText } = body;
  const patch = {};
  if (elementNumber != null) patch.element_number = elementNumber.trim();
  if (elementName != null) patch.element_name = elementName.trim();
  if (questionText != null) patch.question_text = questionText.trim();

  const { data, error } = await supabase.from('sms_gap_questions').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ question: data });
}

export async function DELETE(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: question, error: fetchError } = await supabase.from('sms_gap_questions').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!question || !question.organization_id) return Response.json({ error: 'Pregunta no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, question.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar preguntas propias' }, { status: 403 });
  }

  const { error } = await supabase.from('sms_gap_questions').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
