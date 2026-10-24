// Skylog V2.0 — Reportes: Control de Baterías (instantánea sin rango de
// fechas). Solo gestores.
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
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  const batteryId = searchParams.get('batteryId');
  let batteriesQuery = supabase.from('batteries').select('*').eq('organization_id', organizationId).order('serial_number');
  if (batteryId) batteriesQuery = batteriesQuery.eq('id', batteryId);
  const [{ data: batteries, error: batteriesError }, { data: org }] = await Promise.all([
    batteriesQuery,
    supabase.from('organizations').select('nit').eq('id', organizationId).maybeSingle(),
  ]);
  if (batteriesError) return Response.json({ error: batteriesError.message }, { status: 500 });

  return Response.json({ batteries: batteries || [], org: org ? { nit: org.nit } : null });
}
