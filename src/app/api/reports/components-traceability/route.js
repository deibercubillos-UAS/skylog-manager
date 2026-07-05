import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Trazabilidad de componentes (Hélices/Motores/ESC/personalizados) — roster
// activo con horas/días de uso derivados del odómetro de cada aeronave
// (mismo cálculo que el modal de AircraftCard, ver /api/maintenance/components)
// + historial de cambios (maintenance_components). Toda la flota o una sola
// aeronave (?aircraftId=), mismo patrón que Mantenimiento/Flota. Para el
// reporte descargable en /dashboard/reports.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const aircraftId = searchParams.get('aircraftId') || null;

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        let aircraftQuery = supabase.from('aircraft').select('id, model, serial_number, total_hours').eq('organization_id', orgId);
        if (aircraftId) aircraftQuery = aircraftQuery.eq('id', aircraftId);
        const { data: aircraftList, error: airErr } = await aircraftQuery;
        if (airErr) throw airErr;
        const aircraftById = {};
        (aircraftList || []).forEach(a => { aircraftById[a.id] = a; });
        const aircraftIds = (aircraftList || []).map(a => a.id);

        if (aircraftIds.length === 0) return NextResponse.json({ active: [], history: [] });

        let activeQuery = supabase
            .from('aircraft_components')
            .select('aircraft_id, component_type, name, serial, installed_at, installed_at_aircraft_hours, status')
            .eq('organization_id', orgId)
            .eq('status', 'activo')
            .in('aircraft_id', aircraftIds)
            .order('component_type');
        const { data: activeRows, error: acErr } = await activeQuery;
        if (acErr) throw acErr;

        const active = (activeRows || []).map(c => {
            const aircraft = aircraftById[c.aircraft_id];
            const totalHours = parseFloat(aircraft?.total_hours || 0);
            return {
                aircraft_label: aircraft ? `${aircraft.model} · ${aircraft.serial_number}` : '—',
                component_type: c.component_type,
                name: c.name || '—',
                serial: c.serial || '—',
                installed_at: c.installed_at,
                used_hours: Math.max(0, totalHours - parseFloat(c.installed_at_aircraft_hours || 0)),
                used_days: Math.max(0, Math.floor((Date.now() - new Date(c.installed_at).getTime()) / 86400000)),
            };
        });

        let histQuery = supabase
            .from('maintenance_components')
            .select('aircraft_id, component_type, action, part_old, part_new, notes, created_at')
            .eq('organization_id', orgId)
            .in('aircraft_id', aircraftIds)
            .order('created_at', { ascending: false })
            .limit(500);
        const { data: historyRows, error: histErr } = await histQuery;
        if (histErr) throw histErr;

        const history = (historyRows || []).map(h => ({
            aircraft_label: aircraftById[h.aircraft_id] ? `${aircraftById[h.aircraft_id].model} · ${aircraftById[h.aircraft_id].serial_number}` : '—',
            component_type: h.component_type,
            action: h.action,
            part_old: h.part_old || '—',
            part_new: h.part_new || '—',
            notes: h.notes || '',
            created_at: h.created_at,
        }));

        return NextResponse.json({ active, history });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
