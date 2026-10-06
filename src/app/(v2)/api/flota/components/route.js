// Skylog V2.0 — Flota & Equipo, Fase 2. Componente (30-entidades.md §3.2):
// instancia instalada en una aeronave — su reloj de uso arranca al
// instalarse (horas acumuladas de la aeronave en ese momento,
// `installed_at_aircraft_hours`) y se congela al retirarse. Mismo patrón ya
// probado en producción, sin la tabla de eventos de mantenimiento todavía
// (Fase 4, depende de `maintenance_events` — regla E5: sin función sin uso
// real detrás).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const aircraftId = searchParams.get('aircraftId');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  let query = supabase
    .from('aircraft_components')
    .select('*, aircraft:aircraft_id(serial_number, total_hours, model:model_id(brand, model))')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (aircraftId) query = query.eq('aircraft_id', aircraftId);

  const { data: components, error } = await query;
  if (error) return Response.json({ error: 'Error consultando componentes' }, { status: 500 });

  return Response.json({ components, isManager: isDutyManager(memberships, organizationId) });
}

// POST — instalar un componente nuevo. `installed_at_aircraft_hours` se
// resuelve server-side desde `aircraft.total_hours` — nunca se acepta del
// cliente (regla S2, mismo criterio que `total_hours` en Fase 1).
export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, aircraftId, componentType, serialNumber, name } = body;
  if (!organizationId || !aircraftId || !componentType) {
    return Response.json({ error: 'organizationId, aircraftId y componentType son requeridos' }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede agregar componentes' }, { status: 403 });
  }

  const { data: aircraft, error: aircraftError } = await supabase
    .from('aircraft')
    .select('id, total_hours')
    .eq('id', aircraftId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (aircraftError) return Response.json({ error: 'Error verificando la aeronave' }, { status: 500 });
  if (!aircraft) return Response.json({ error: 'La aeronave no pertenece a esta organización' }, { status: 400 });

  const { data, error } = await supabase
    .from('aircraft_components')
    .insert({
      organization_id: organizationId,
      aircraft_id: aircraftId,
      component_type: componentType,
      serial_number: serialNumber || null,
      name: typeof name === 'string' && name.trim() ? name.trim().slice(0, 150) : null,
      installed_at_aircraft_hours: aircraft.total_hours,
      created_by: personId,
    })
    .select('*, aircraft:aircraft_id(serial_number, total_hours, model:model_id(brand, model))')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ component: data });
}
