// Skylog V2.0 — Reportes: Tiempos de Servicio (RAC 100 §100.540) —
// registro diario por piloto (100.535(10)-(11)). Solo gestores.
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
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const personId = searchParams.get('personId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('duty_periods')
    .select('id, type, started_at, ended_at, person:person_id(full_name)')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false });
  if (from) query = query.gte('started_at', from);
  if (to) query = query.lte('started_at', `${to}T23:59:59`);
  if (personId) query = query.eq('person_id', personId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const periods = (data || []).map((p) => ({ ...p, person_name: p.person?.full_name || '—' }));
  return Response.json({ periods });
}
