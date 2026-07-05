import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

// GET /api/reports/aerocivil-monthly?month=YYYY-MM
// Datos crudos para el reporte operacional mensual UAS (circular AeroCivil
// 2026351070026944) — una fila por vuelo, join a aeronave (RUAS) y a la misión
// (flight_authorizations) por si el vuelo no trae mission_type/line_of_sight
// propio (el flujo con orden de vuelo no los copia al vuelo, solo vive en la
// misión). El armado del Excel y la derivación de "condición de vuelo"
// (DIURNO/NOCTURNO/MIXTO) vive en el cliente (lib/reportGenerators.js).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    if (!month || !MONTH_REGEX.test(month)) {
      return NextResponse.json({ error: 'Formato de mes inválido. Use YYYY-MM' }, { status: 400 });
    }

    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
    if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const to   = new Date(y, m, 0).toISOString().slice(0, 10); // último día del mes

    const { data: org } = await supabase
      .from('organizations').select('company_name').eq('id', orgId).single();

    const { data, error } = await supabase
      .from('flights')
      .select(`
        id, flight_date, takeoff_time, landing_time, total_time, mission_type, line_of_sight,
        aircraft:aircraft_id(ruas),
        authorization:auth_id(mission_type, line_of_sight, aerocivil_auth_number)
      `)
      .eq('organization_id', orgId)
      .gte('flight_date', from)
      .lte('flight_date', to)
      .order('flight_date', { ascending: true });

    if (error) throw error;

    const rows = (data || []).map(f => ({
      aerocivil_auth_number: f.authorization?.aerocivil_auth_number || null,
      company_name:          org?.company_name || '',
      flight_date:           f.flight_date,
      total_time:            f.total_time,
      ruas:                  f.aircraft?.ruas || null,
      line_of_sight:         f.line_of_sight || f.authorization?.line_of_sight || null,
      mission_type:          f.mission_type || f.authorization?.mission_type || null,
      takeoff_time:          f.takeoff_time,
      landing_time:          f.landing_time,
    }));

    return NextResponse.json({ month, rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
