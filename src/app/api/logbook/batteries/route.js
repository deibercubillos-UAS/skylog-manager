import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await request.json();
        
        const { data, error } = await supabase.from('battery_logs').insert([{
            owner_id: user.id,
            aircraft_id: body.aircraft_id,
            battery_model: body.battery_model,
            battery_sn: body.battery_sn,
            charge_percentage: body.charge_percentage,
            cycle_number: body.cycle_number,
            notes: body.notes
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}