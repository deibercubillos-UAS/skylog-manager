import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('flight_authorizations')
            .select('*, pilots(name), aircraft(model), flights(id)')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const result = data.map(auth => ({ ...auth, is_completed: auth.flights.length > 0 }));
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

        const { data, error } = await supabase.from('flight_authorizations').insert([{
            owner_id: user.id,
            pilot_id: body.pilot_id,
            aircraft_id: body.aircraft_id,
            location: body.location,
            scheduled_at: body.scheduled_at,
            mission_id: body.mission_id,
            status: 'autorizado'
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// NUEVO: MÉTODO PARA EDITAR MISIONES EXISTENTES
export async function PATCH(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const body = await request.json();

        const { data, error } = await supabase
            .from('flight_authorizations')
            .update({
                pilot_id: body.pilot_id,
                aircraft_id: body.aircraft_id,
                location: body.location,
                scheduled_at: body.scheduled_at,
                mission_id: body.mission_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', body.id)
            .eq('owner_id', user.id)
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}