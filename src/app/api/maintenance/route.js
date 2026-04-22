import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const { data, error } = await supabase
            .from('maintenance_logs')
            .select('*, aircraft(model, serial_number)')
            .eq('organization_id', prof.organization_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
        const body = await request.json();
        const today = new Date().toISOString().split('T')[0];

        // 1. Registrar el Mantenimiento (compatibilidad con columnas legadas)
        const { data: log, error: mErr } = await supabase.from('maintenance_logs').insert([{
            aircraft_id: body.aircraft_id,
            maintenance_type: body.maintenance_type,
            description: body.description,
            hours_at_service: body.hours_at_service,
            technician: body.technician_name,       // <-- columna legada NOT NULL
            technician_name: body.technician_name,  // <-- columna nueva
            organization_id: prof.organization_id
        }]).select().single();

        if (mErr) throw mErr;

        // 2. REINICIAR CONTADORES EN EL DRONE
        await supabase.from('aircraft').update({
            last_maintenance_date: today,
            last_maintenance_hours: body.hours_at_service
        }).eq('id', body.aircraft_id);

        return NextResponse.json(log);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}