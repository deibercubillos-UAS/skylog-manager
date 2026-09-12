// Skylog V2.0 — Área de Capacitación y Examen (página propia, a pedido del
// usuario). Configuración del examen: umbral de aprobación, intentos por
// ciclo, recurrencia. Una sola configuración por organización.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { cycleLengthDays } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, passingScore, maxAttempts, recurrence, recurrenceDays, startDate } = body;
  if (!organizationId || passingScore == null || !maxAttempts || !recurrence || !startDate) {
    return Response.json({ error: 'organizationId, passingScore, maxAttempts, recurrence y startDate son requeridos' }, { status: 400 });
  }
  if (passingScore < 0 || passingScore > 100) return Response.json({ error: 'passingScore debe estar entre 0 y 100' }, { status: 400 });

  try {
    cycleLengthDays(recurrence, recurrenceDays);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede configurar el examen' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('training_exams')
    .upsert(
      {
        organization_id: organizationId,
        passing_score: passingScore,
        max_attempts: maxAttempts,
        recurrence,
        recurrence_days: recurrence === 'personalizado' ? recurrenceDays : null,
        start_date: startDate,
        created_by: personId,
      },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ exam: data });
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

  const { data, error } = await supabase.from('training_exams').select('*').eq('organization_id', organizationId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ exam: data });
}
