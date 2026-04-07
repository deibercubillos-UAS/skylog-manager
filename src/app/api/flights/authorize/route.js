import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Traemos autorizaciones y verificamos si tienen un vuelo vinculado en la tabla 'flights'
        const { data, error } = await supabase
            .from('flight_authorizations')
            .select('*, pilots(name), aircraft(model), flights(id)')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Mapeamos para determinar el estatus real
        const result = data.map(auth => ({
            ...auth,
            is_completed: auth.flights.length > 0
        }));

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await request.json();

        // 1. Obtener el prefijo del usuario (3 letras)
        const { data: profile } = await supabase.from('profiles').select('flight_prefix').eq('id', user.id).single();
        const prefix = (profile?.flight_prefix || 'BIT').toUpperCase().substring(0, 3);

        // 2. Calcular siguiente número correlativo
        const { count } = await supabase.from('flight_authorizations').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
        const missionId = `${prefix}-${((count || 0) + 1).toString().padStart(3, '0')}`;

        const { data, error } = await supabase.from('flight_authorizations').insert([{
            owner_id: user.id,
            pilot_id: body.pilot_id,
            aircraft_id: body.aircraft_id,
            location: body.location,
            scheduled_at: body.scheduled_at,
            mission_id: missionId
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}