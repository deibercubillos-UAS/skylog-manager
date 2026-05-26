import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit  = Math.min(parseInt(searchParams.get('limit')  || '30'), 500);
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        const prof = { organization_id: orgId }; // compat alias

        const { data, error } = await supabase
            .from('flights')
            .select(`
                id,
                mission_id,
                flight_date,
                takeoff_time,
                landing_time,
                mission_type,
                visual_condition,
                location,
                notes,
                incidents,
                imported,
                pilots:pilot_id(name),
                aircraft:aircraft_id(model, serial_number, total_hours)
            `)
            .eq('organization_id', prof.organization_id)
            .order('flight_date', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        const res = NextResponse.json(data || []);
        res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
        return res;
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}