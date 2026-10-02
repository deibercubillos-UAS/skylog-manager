// Skylog V2.0 — Capacitación: CRUD de evaluaciones discretas
// (`capacitacion_evaluations`) — reemplaza el examen recurrente único por
// pista (`training_exams`, decisión 55/121, ahora sin material_*) por
// varias evaluaciones a través del tiempo, cada una con su propia fecha
// límite (`due_date`) — a pedido explícito del usuario. `type` sigue
// agrupando por pista (lib/v2/training.js), pero ya no es la llave única:
// puede haber N evaluaciones por (organización, pista).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { TRAINING_TYPES } from '@/lib/v2/training';

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

  const { data, error } = await supabase
    .from('capacitacion_evaluations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('type', type)
    .order('due_date');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ evaluations: data || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, type, title, passingScore, maxAttempts, dueDate } = body;
  if (!organizationId || !type || !title?.trim() || passingScore == null || !maxAttempts || !dueDate) {
    return Response.json({ error: 'organizationId, type, title, passingScore, maxAttempts y dueDate son requeridos' }, { status: 400 });
  }
  if (!TRAINING_TYPES.includes(type)) return Response.json({ error: 'type inválido' }, { status: 400 });
  if (passingScore < 0 || passingScore > 100) return Response.json({ error: 'passingScore debe estar entre 0 y 100' }, { status: 400 });
  if (maxAttempts < 1) return Response.json({ error: 'maxAttempts debe ser al menos 1' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede crear evaluaciones' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('capacitacion_evaluations')
    .insert({
      organization_id: organizationId,
      type,
      title: title.trim(),
      passing_score: passingScore,
      max_attempts: maxAttempts,
      due_date: dueDate,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ evaluation: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, title, passingScore, maxAttempts, dueDate } = body;
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('capacitacion_evaluations').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar evaluaciones' }, { status: 403 });
  }

  const patch = {};
  if (title != null) patch.title = title.trim();
  if (passingScore != null) patch.passing_score = passingScore;
  if (maxAttempts != null) patch.max_attempts = maxAttempts;
  if (dueDate != null) patch.due_date = dueDate;

  const { data, error } = await supabase.from('capacitacion_evaluations').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ evaluation: data });
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

  const { data: existing, error: fetchError } = await supabase.from('capacitacion_evaluations').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar evaluaciones' }, { status: 403 });
  }

  const { error } = await supabase.from('capacitacion_evaluations').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
