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
        const pilotId = searchParams.get('pilotId');

        if (!pilotId) return NextResponse.json({ error: "Pilot ID required" }, { status: 400 });

        const supabase = await createClientSSR();
        const ctx = await getOrgContext(supabase);
        if (!ctx.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        const prof = { organization_id: ctx.orgId, role: ctx.role };
        if (!ctx.role || !PERMISSIONS.canViewAudit.includes(ctx.role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        const { data, error } = await supabase
            .from('flights')
            .select(`
                flight_date,
                mission_id,
                location,
                takeoff_time,
                landing_time,
                total_time,
                notes,
                aircraft:aircraft_id(model, serial_number),
                pilots:pilot_id(name, license_number)
            `)
            .eq('organization_id', prof.organization_id)
            .eq('pilot_id', pilotId)
            .gte('flight_date', from)
            .lte('flight_date', to)
            .order('flight_date', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}