// Skylog V2.0 — SMS-D: catálogo GAP efectivo para una organización —
// catálogo oficial global (organization_id null) menos lo que la org ocultó
// + las preguntas propias que la org agregó (componente 5). Nunca muta el
// catálogo global desde la app (regla C1: se precarga, no se impone).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const includeHidden = searchParams.get('includeHidden') === '1';
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(organizationId)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const [questionsRes, visibilityRes] = await Promise.all([
    supabase.from('sms_gap_questions').select('*').or(`organization_id.is.null,organization_id.eq.${organizationId}`).order('component_number').order('order_index'),
    supabase.from('sms_gap_question_visibility').select('question_id, hidden').eq('organization_id', organizationId),
  ]);
  if (questionsRes.error) return Response.json({ error: questionsRes.error.message }, { status: 500 });
  if (visibilityRes.error) return Response.json({ error: visibilityRes.error.message }, { status: 500 });

  const hiddenIds = new Set((visibilityRes.data || []).filter((v) => v.hidden).map((v) => v.question_id));
  const questions = (questionsRes.data || [])
    .map((q) => ({ ...q, hidden: hiddenIds.has(q.id) }))
    .filter((q) => includeHidden || !q.hidden);

  return Response.json({ questions });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, elementNumber, elementName, questionText } = body;
  if (!organizationId || !elementNumber?.trim() || !elementName?.trim() || !questionText?.trim()) {
    return Response.json({ error: 'organizationId, elementNumber, elementName y questionText son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede agregar preguntas propias' }, { status: 403 });
  }

  const { count } = await supabase.from('sms_gap_questions').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId);

  const { data, error } = await supabase
    .from('sms_gap_questions')
    .insert({
      organization_id: organizationId,
      component_number: 5,
      component_name: 'Preguntas personalizadas de la organización',
      element_number: elementNumber.trim(),
      element_name: elementName.trim(),
      question_text: questionText.trim(),
      order_index: 1000 + (count || 0),
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ question: data });
}
