import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search?q=texto
 *
 * Búsqueda global acotada a la organización del usuario. Busca en:
 *   - flights (misión, modelo/serie de aeronave)
 *   - aircraft (modelo, serie, RUAS)
 *   - pilots (nombre, licencia)
 *
 * Todas las consultas filtran por organization_id (vía getOrgContext) — sin
 * acceso cross-tenant. Devuelve como máximo 5 resultados por categoría.
 */
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const q = (new URL(request.url).searchParams.get('q') || '').trim();
    if (q.length < 2) return NextResponse.json({ results: [] });

    const like = `%${q}%`;

    const [flightsRes, aircraftRes, pilotsRes] = await Promise.all([
      supabase
        .from('flights')
        .select('id, mission_id, flight_date, aircraft:aircraft_id(model, serial_number)')
        .eq('organization_id', orgId)
        .ilike('mission_id', like)
        .order('flight_date', { ascending: false })
        .limit(5),
      supabase
        .from('aircraft')
        .select('id, model, serial_number, ruas')
        .eq('organization_id', orgId)
        .or(`model.ilike.${like},serial_number.ilike.${like},ruas.ilike.${like}`)
        .limit(5),
      supabase
        .from('pilots')
        .select('id, name, license_number')
        .eq('organization_id', orgId)
        .or(`name.ilike.${like},license_number.ilike.${like}`)
        .limit(5),
    ]);

    const results = [
      ...(aircraftRes.data || []).map(a => ({
        type: 'aircraft', icon: 'precision_manufacturing',
        title: a.model || 'Aeronave', subtitle: a.serial_number || a.ruas || '',
        href: '/dashboard/fleet',
      })),
      ...(pilotsRes.data || []).map(p => ({
        type: 'pilot', icon: 'group',
        title: p.name || 'Piloto', subtitle: p.license_number || '',
        href: '/dashboard/pilots',
      })),
      ...(flightsRes.data || []).map(f => ({
        type: 'flight', icon: 'menu_book',
        title: f.mission_id || 'Vuelo', subtitle: `${f.flight_date || ''} · ${f.aircraft?.model || ''}`.trim(),
        href: '/dashboard/logbook',
      })),
    ];

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
