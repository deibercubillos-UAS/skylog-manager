import { createClientSSR } from '@/lib/supabaseServer';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        // Libro de Vuelo: alcance opcional a una o varias aeronaves (ids separados por coma)
        const aircraftIds = (searchParams.get('aircraftIds') || '')
            .split(',').map(s => s.trim()).filter(Boolean);

        const supabase = await createClientSSR();
        const ctx = await getOrgContext(supabase);
        if (!ctx.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        const prof = { organization_id: ctx.orgId, role: ctx.role };
        if (!ctx.role || !PERMISSIONS.canViewAudit.includes(ctx.role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        let query = supabase
            .from('flights')
            .select(`
                flight_date,
                mission_id,
                mission_type,
                location,
                visual_condition,
                takeoff_time,
                landing_time,
                notes,
                aircraft:aircraft_id(brand, model, serial_number, ruas, total_hours),
                pilots:pilot_id(name, license_number)
            `)
            .eq('organization_id', prof.organization_id)
            .gte('flight_date', from)
            .lte('flight_date', to)
            .order('flight_date', { ascending: true });

        if (aircraftIds.length) query = query.in('aircraft_id', aircraftIds);

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}