import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const { data, error } = await supabase
            .from('flights')
            .select(`
                mission_id,
                location,
                visual_condition,
                flight_date,
                battery:battery_id(serial_number, brand, cycles),
                aircraft:aircraft_id(model)
            `)
            .eq('organization_id', prof.organization_id)
            .gte('flight_date', from)
            .lte('flight_date', to)
            .order('flight_date', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}