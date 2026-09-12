// Skylog V2.0 — Área de Capacitación y Examen. Banco de preguntas — solo
// gestores pueden leer/escribir (RLS lo exige incluso para SELECT, ver
// migración training_exam: correct_index nunca debe llegar a quien presenta
// el examen).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, question, options, correctIndex, orderIndex } = body;
  if (!organizationId || !question || !Array.isArray(options) || options.length < 2 || correctIndex == null) {
    return Response.json({ error: 'organizationId, question, options (≥2) y correctIndex son requeridos' }, { status: 400 });
  }
  if (correctIndex < 0 || correctIndex >= options.length) {
    return Response.json({ error: 'correctIndex debe apuntar a una opción real' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede administrar el banco de preguntas' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('training_exam_questions')
    .insert({
      organization_id: organizationId,
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
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  // RLS ya restringe SELECT a gestores — si un no-gestor llama esto, recibe
  // lista vacía (no error), coherente con el resto del proyecto.
  const { data, error } = await supabase
    .from('training_exam_questions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('order_index');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ questions: data });
}
