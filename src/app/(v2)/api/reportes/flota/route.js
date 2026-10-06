// Skylog V2.0 — Reportes: Flota (inventario de aeronaves, instantánea sin
// rango de fechas). Solo gestores.
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
  const aircraftId = searchParams.get('aircraftId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('aircraft')
    .select(
      'id, serial_number, ruas_number, total_hours, operational_status, ownership_type, ownership_reference, firmware_version, firmware_previous_version, firmware_updated_at, actual_weight_kg, model:model_id(*)'
    )
    .eq('organization_id', organizationId)
    .order('serial_number');
  if (aircraftId) query = query.eq('id', aircraftId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const aircraft = (data || []).map((a) => ({ ...a, model_label: a.model ? `${a.model.brand} ${a.model.model}` : '—' }));
  // Ficha técnica (Apéndice 1 Parte B): una por modelo presente en el alcance del reporte, no una por unidad.
  const models = [...new Map((data || []).filter((a) => a.model).map((a) => [a.model.id, a.model])).values()];
  return Response.json({ aircraft, models });
}
