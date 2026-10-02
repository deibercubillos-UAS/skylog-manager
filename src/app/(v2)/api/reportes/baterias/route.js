// Skylog V2.0 — Reportes: Baterías y Componentes (instantánea sin rango de
// fechas). Solo gestores. `used_hours` de cada componente se deriva del
// odómetro de su aeronave (mismo criterio que `/flota/baterias`, nunca se
// guarda como columna aparte).
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
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  const [{ data: batteries, error: batteriesError }, { data: componentRows, error: componentsError }] = await Promise.all([
    supabase.from('batteries').select('*').eq('organization_id', organizationId).order('serial_number'),
    supabase
      .from('aircraft_components')
      .select('id, component_type, serial_number, installed_at, installed_at_aircraft_hours, status, aircraft:aircraft_id(serial_number, total_hours, model:model_id(brand, model))')
      .eq('organization_id', organizationId)
      .eq('status', 'activo')
      .order('installed_at', { ascending: false }),
  ]);
  if (batteriesError) return Response.json({ error: batteriesError.message }, { status: 500 });
  if (componentsError) return Response.json({ error: componentsError.message }, { status: 500 });

  const components = (componentRows || []).map((c) => ({
    ...c,
    aircraft_label: c.aircraft ? [c.aircraft.serial_number, c.aircraft.model && `${c.aircraft.model.brand} ${c.aircraft.model.model}`].filter(Boolean).join(' — ') : '—',
    used_hours: c.aircraft?.total_hours != null && c.installed_at_aircraft_hours != null ? c.aircraft.total_hours - c.installed_at_aircraft_hours : null,
  }));

  return Response.json({ batteries: batteries || [], components });
}
