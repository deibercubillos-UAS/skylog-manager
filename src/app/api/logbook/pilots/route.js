import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const pilotId = searchParams.get('pilotId');
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        let query = supabase
            .from('flights')
            .select('id,mission_id,flight_date,mission_type,visual_condition,pilots:pilot_id(name),aircraft:aircraft_id(model,serial_number)')
            .eq('owner_id', user.id)
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