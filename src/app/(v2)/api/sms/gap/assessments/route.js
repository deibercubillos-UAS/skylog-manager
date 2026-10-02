// Skylog V2.0 — SMS-D: autoevaluaciones GAP de una organización — lista con
// % de cumplimiento real (computeGapStats, nunca guardado como columna) y
// creación de una evaluación nueva.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { computeGapStats } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!organizationIds.includes(organizationId)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { data: assessments, error } = await supabase
    .from('sms_gap_assessments')
    .select('*, responses:sms_gap_responses(response, question:question_id(component_number))')
    .eq('organization_id', organizationId)
    .order('assessment_date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const withStats = (assessments || []).map((a) => {
    const responses = (a.responses || []).map((r) => ({ componentNumber: r.question?.component_number, response: r.response }));
    return { ...a, responses: undefined, stats: computeGapStats(responses) };
  });

  return Response.json({ assessments: withStats });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, title, assessmentDate } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede crear una autoevaluación GAP' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_gap_assessments')
    .insert({ organization_id: organizationId, title: title?.trim() || null, assessment_date: assessmentDate || new Date().toISOString().slice(0, 10), created_by: personId })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ assessment: data });
}
