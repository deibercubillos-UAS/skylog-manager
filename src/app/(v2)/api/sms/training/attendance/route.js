// Skylog V2.0 — F3. Asistencia real a una ocurrencia del cronograma SMS.
// Roster = cualquier persona con membresía activa en la organización, no
// solo pilotos (40-sms.md §5.2 fase 4).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { sessionId, personId: attendeePersonId, occurrenceDate } = body;
  if (!sessionId || !attendeePersonId || !occurrenceDate) {
    return Response.json({ error: 'sessionId, personId y occurrenceDate son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: session, error: sessionError } = await supabase
    .from('sms_training_sessions')
    .select('id, organization_id')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionError) return Response.json({ error: 'Error verificando la sesión' }, { status: 500 });
  if (!session) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });
  if (!isDutyManager(memberships, session.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede registrar asistencia' }, { status: 403 });
  }

  // El asistente debe tener membresía real en la misma organización — nunca
  // se confía en el id que manda el cliente (mismo patrón ya usado en F5/F4a).
  const { data: attendeeMembership, error: membershipError } = await supabase
    .from('memberships')
    .select('id')
    .eq('person_id', attendeePersonId)
    .eq('organization_id', session.organization_id)
    .eq('status', 'activa')
    .maybeSingle();
  if (membershipError) return Response.json({ error: 'Error verificando al asistente' }, { status: 500 });
  if (!attendeeMembership) return Response.json({ error: 'Esa persona no tiene membresía activa en esta organización' }, { status: 404 });

  const { data, error } = await supabase
    .from('sms_training_attendance')
    .insert({
      session_id: sessionId,
      organization_id: session.organization_id,
      person_id: attendeePersonId,
      occurrence_date: occurrenceDate,
      recorded_by: personId,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Esta persona ya tiene asistencia registrada para esa ocurrencia' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ attendance: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return Response.json({ error: 'sessionId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('sms_training_attendance')
    .select('*')
    .eq('session_id', sessionId)
    .order('occurrence_date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ attendance: data });
}
