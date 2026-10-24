// Skylog V2.0 — Bitácora de Vuelo del Piloto UAS (resumen). Por piloto: horas totales, horas por aeronave y horas
// por línea de vista (VLOS/EVLOS/BVLOS, que en V2 es `flights.visual_condition`). Solo gestores.
// Sin `pilotId` devuelve a todos los pilotos con vuelos en el periodo; con `list=1` solo el listado para el selector.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { resolveReportFormat } from '@skylog/domain';

const LOS = ['VLOS', 'EVLOS', 'BVLOS'];

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const pilotId = searchParams.get('pilotId');
  const listOnly = searchParams.get('list') === '1';
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase
      .from('flights')
      .select('pilot_person_id, total_time, visual_condition, aircraft_id, aircraft:aircraft_id(serial_number, ruas_number, model:model_id(brand, model)), pilot:pilot_person_id(id, full_name, document_type, document_number, license_number)')
      .eq('organization_id', organizationId)
      .not('pilot_person_id', 'is', null)
      .order('takeoff_at', { ascending: true })
      .range(offset, offset + 999);
    if (!listOnly) {
      if (from) query = query.gte('takeoff_at', from);
      if (to) query = query.lte('takeoff_at', `${to}T23:59:59`);
    }
    if (pilotId) query = query.eq('pilot_person_id', pilotId);
    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  const byPilot = new Map();
  for (const f of rows) {
    if (!f.pilot) continue;
    const p = byPilot.get(f.pilot_person_id) || { person: f.pilot, flights: 0, hours: 0, los: { VLOS: 0, EVLOS: 0, BVLOS: 0, other: 0 }, aircraft: new Map() };
    const h = Number(f.total_time) || 0;
    p.flights += 1;
    p.hours += h;
    const los = String(f.visual_condition || '').trim().toUpperCase();
    p.los[LOS.includes(los) ? los : 'other'] += h;
    const a = p.aircraft.get(f.aircraft_id) || { serial: f.aircraft?.serial_number || '—', ruas: f.aircraft?.ruas_number || '', model: [f.aircraft?.model?.brand, f.aircraft?.model?.model].filter(Boolean).join(' '), flights: 0, hours: 0 };
    a.flights += 1;
    a.hours += h;
    p.aircraft.set(f.aircraft_id, a);
    byPilot.set(f.pilot_person_id, p);
  }
  const pilots = [...byPilot.values()]
    .map((p) => ({ ...p, aircraft: [...p.aircraft.values()].sort((x, y) => y.hours - x.hours) }))
    .sort((a, b) => a.person.full_name.localeCompare(b.person.full_name, 'es'));

  if (listOnly) return Response.json({ pilots: pilots.map((p) => ({ id: p.person.id, full_name: p.person.full_name })) });

  const { data: org } = await supabase.from('organizations').select('nit, nit_type, report_formats').eq('id', organizationId).maybeSingle();
  return Response.json({ pilots, org: org ? { nit: org.nit, nit_type: org.nit_type } : null, format: resolveReportFormat(org?.report_formats || {}, 'bitacora_piloto') });
}
