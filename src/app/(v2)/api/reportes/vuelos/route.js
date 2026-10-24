// Skylog V2.0 — Reportes: Libro de Vuelo. Solo gestores (mismo criterio de
// v1: canViewAudit ≈ isDutyManager).
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
  const aircraftId = searchParams.get('aircraftId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('flights')
    .select('id, takeoff_at, landing_at, total_time, visual_condition, mission_type, location, notes, aircraft_id, aircraft:aircraft_id(serial_number, ruas_number, total_hours, operational_status, model:model_id(brand, model)), pilot:pilot_person_id(full_name, document_type, document_number, license_number)')
    .eq('organization_id', organizationId)
    .order('takeoff_at', { ascending: false });
  if (from) query = query.gte('takeoff_at', from);
  if (to) query = query.lte('takeoff_at', `${to}T23:59:59`);
  if (aircraftId) query = query.eq('aircraft_id', aircraftId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const flights = (data || []).map((f) => ({
    ...f,
    aircraft_label: f.aircraft ? [f.aircraft.serial_number, f.aircraft.model && `${f.aircraft.model.brand} ${f.aircraft.model.model}`].filter(Boolean).join(' — ') : '—',
    pilot_name: f.pilot?.full_name || '—',
  }));

  // Datos para el formato por vuelo: ciclos acumulados, último mantenimiento mayor/menor y NIT de la organización.
  const aircraftIds = [...new Set([...flights.map((f) => f.aircraft_id), aircraftId].filter(Boolean))];
  const [{ data: allFlights }, { data: events }, { data: org }, { data: aircraftRow }] = await Promise.all([
    aircraftIds.length ? supabase.from('flights').select('aircraft_id, takeoff_at').eq('organization_id', organizationId).in('aircraft_id', aircraftIds) : Promise.resolve({ data: [] }),
    aircraftIds.length
      ? supabase.from('maintenance_events').select('aircraft_id, type, performed_at, performed_at_aircraft_hours, performer:performed_by(full_name, license_number)').eq('organization_id', organizationId).in('aircraft_id', aircraftIds).order('performed_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('organizations').select('nit, nit_type').eq('id', organizationId).maybeSingle(),
    aircraftId ? supabase.from('aircraft').select('id, serial_number, ruas_number, total_hours, operational_status, model:model_id(brand, model)').eq('organization_id', organizationId).eq('id', aircraftId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return Response.json({ flights, cycles: allFlights || [], maintenance: events || [], org: org || null, aircraft: aircraftRow || null });
}
