// Skylog V2.0 — Reportes: Libro de Vuelo. Solo gestores (mismo criterio de
// v1: canViewAudit ≈ isDutyManager).
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
  const aircraftId = searchParams.get('aircraftId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('flights')
    .select('id, takeoff_at, landing_at, total_time, visual_condition, mission_type, aircraft:aircraft_id(serial_number, model:model_id(brand, model)), pilot:pilot_person_id(full_name)')
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

  return Response.json({ flights });
}
