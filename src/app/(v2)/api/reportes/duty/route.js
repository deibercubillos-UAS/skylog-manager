// Skylog V2.0 — Reportes: Tiempos de Servicio (RAC 100 §100.540) —
// registro diario por piloto (100.535(10)-(11)). Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const personId = searchParams.get('personId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('duty_periods')
    .select('id, type, started_at, ended_at, person_id')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false });
  if (from) query = query.gte('started_at', from);
  if (to) query = query.lte('started_at', `${to}T23:59:59`);
  if (personId) query = query.eq('person_id', personId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // `duty_periods` no tiene llave foránea hacia `people` (el historial se conserva aunque la persona se elimine), así que
  // el embed de PostgREST no existe: los nombres se piden aparte.
  const ids = [...new Set((data || []).map((p) => p.person_id).filter(Boolean))];
  const { data: people } = ids.length ? await supabase.from('people').select('id, full_name').in('id', ids) : { data: [] };
  const names = Object.fromEntries((people || []).map((x) => [x.id, x.full_name]));
  const periods = (data || []).map(({ person_id, ...p }) => ({ ...p, person_name: names[person_id] || '—' }));
  return Response.json({ periods });
}
