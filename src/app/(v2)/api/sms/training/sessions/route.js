// Skylog V2.0 — F3. Cronograma de capacitación SMS (recurrente).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { cycleLengthDays, nextOccurrence } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, topic, recurrence, recurrenceDays, startDate } = body;
  if (!organizationId || !topic || !recurrence || !startDate) {
    return Response.json({ error: 'organizationId, topic, recurrence y startDate son requeridos' }, { status: 400 });
  }

  try {
    cycleLengthDays(recurrence, recurrenceDays);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede crear el cronograma de capacitación SMS' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_training_sessions')
    .insert({
      organization_id: organizationId,
      topic,
      recurrence,
      recurrence_days: recurrence === 'personalizado' ? recurrenceDays : null,
      start_date: startDate,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: data });
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

  const { data, error } = await supabase
    .from('sms_training_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const sessions = (data || []).map((s) => ({
    ...s,
    nextOccurrence: nextOccurrence({ recurrence: s.recurrence, recurrenceDays: s.recurrence_days, startDate: s.start_date }),
  }));

  return Response.json({ sessions });
}
