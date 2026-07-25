import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit  = Math.min(parseInt(searchParams.get('limit')  || '30'), 500);
        const offset = parseInt(searchParams.get('offset') || '0');
        const idFilter = searchParams.get('id') || null;

        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        const prof = { organization_id: orgId }; // compat alias

        let query = supabase
            .from('flights')
            .select(`
                id,
                mission_id,
                flight_date,
                takeoff_time,
                landing_time,
                total_time,
                mission_type,
                visual_condition,
                location,
                notes,
                incidents,
                imported,
                replay_path,
                has_alerts,
                alerts_json,
                pilots:pilot_id(name),
                aircraft:aircraft_id(model, serial_number, total_hours)
            `)
            .eq('organization_id', prof.organization_id)
            .order('flight_date', { ascending: false });

        if (idFilter) {
            query = query.eq('id', idFilter);
        } else {
            query = query.range(offset, offset + limit - 1);
        }

        const { data, error } = await query;

        if (error) throw error;

        const res = NextResponse.json(data || []);
        res.headers.set('Cache-Control', 'no-store');
        return res;
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}