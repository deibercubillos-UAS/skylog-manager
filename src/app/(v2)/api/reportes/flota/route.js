// Skylog V2.0 — Reportes: Flota (inventario de aeronaves, instantánea sin
// rango de fechas). Solo gestores.
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
  const aircraftId = searchParams.get('aircraftId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('aircraft')
    .select(
      'id, serial_number, ruas_number, total_hours, operational_status, ownership_type, ownership_reference, firmware_version, firmware_previous_version, firmware_updated_at, actual_weight_kg, model:model_id(*)'
    )
    .eq('organization_id', organizationId)
    .order('serial_number');
  if (aircraftId) query = query.eq('id', aircraftId);

  const [{ data, error }, { data: org }] = await Promise.all([query, supabase.from('organizations').select('nit').eq('id', organizationId).maybeSingle()]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const aircraft = (data || []).map((a) => ({ ...a, model_label: a.model ? `${a.model.brand} ${a.model.model}` : '—' }));
  return Response.json({ aircraft, org: org ? { nit: org.nit } : null });
}
