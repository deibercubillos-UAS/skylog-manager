import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const pilotId = searchParams.get('pilotId');

        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        // Filtrar por organization_id (aislamiento de tenant)
        // pilotId es opcional: si se pasa, muestra solo los vuelos de ese piloto
        let query = supabase
            .from('flights')
            .select('id,mission_id,flight_date,mission_type,visual_condition,pilots:pilot_id(name),aircraft:aircraft_id(model,serial_number)')
            .eq('organization_id', orgId)
            .order('flight_date', { ascending: false })
            .limit(200);

        if (pilotId) {
            query = query.eq('pilot_id', pilotId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
