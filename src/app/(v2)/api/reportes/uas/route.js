// Skylog V2.0 — Reportes: Libro de UAS. Una ficha por aeronave con los totales acumulados (vuelos, horas, ciclos)
// y el último mantenimiento mayor/menor. Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { resolveReportFormat } from '@skylog/domain';

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

  let aircraftQuery = supabase
    .from('aircraft')
    .select('id, serial_number, ruas_number, total_hours, operational_status, model:model_id(brand, model)')
    .eq('organization_id', organizationId)
    .order('serial_number');
  if (aircraftId) aircraftQuery = aircraftQuery.eq('id', aircraftId);
  const { data: aircraft, error } = await aircraftQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = (aircraft || []).map((a) => a.id);
  const [{ data: flights }, { data: events }, { data: org }] = await Promise.all([
    ids.length ? supabase.from('flights').select('aircraft_id, takeoff_at, total_time, visual_condition, pilot:pilot_person_id(full_name)').eq('organization_id', organizationId).in('aircraft_id', ids).order('takeoff_at', { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from('maintenance_events').select('aircraft_id, type, performed_at, performed_at_aircraft_hours, performer:performed_by(full_name, license_number)').eq('organization_id', organizationId).in('aircraft_id', ids).order('performed_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('organizations').select('nit, report_formats').eq('id', organizationId).maybeSingle(),
  ]);

  const units = (aircraft || []).map((a) => {
    const fl = (flights || []).filter((f) => f.aircraft_id === a.id); // ya vienen del más reciente al más antiguo
    const ev = (events || []).filter((e) => e.aircraft_id === a.id);
    return {
      aircraft: a,
      flights: {
        count: fl.length,
        hours: fl.reduce((sum, f) => sum + Number(f.total_time || 0), 0),
        first: fl.length ? fl[fl.length - 1].takeoff_at : null,
        last: fl.length ? fl[0].takeoff_at : null,
        lastPilot: fl[0]?.pilot?.full_name || '',
        lastCondition: fl[0]?.visual_condition || '',
      },
      major: ev.find((e) => e.type !== 'menor') || null,
      minor: ev.find((e) => e.type === 'menor') || null,
    };
  });

  return Response.json({ units, org: { nit: org?.nit || null }, format: resolveReportFormat(org?.report_formats || {}, 'uas') });
}
