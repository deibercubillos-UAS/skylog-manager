import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const { data, error } = await supabase.from('flight_authorizations').select('*, pilots:pilot_id(name), aircraft:aircraft_id(model)').eq('organization_id', prof.organization_id).order('created_at', { ascending: false });
        return NextResponse.json(data || []);
    } catch (err) { return NextResponse.json([], { status: 500 }); }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('flight_prefix').eq('id', prof.organization_id).single();
        const body = await request.json();
        const prefix = org.flight_prefix || 'BIT';
        const { count } = await supabase.from('flight_authorizations').select('*', { count: 'exact', head: true }).eq('organization_id', prof.organization_id).ilike('mission_id', `${prefix}-%`);
        const missionId = `${prefix}-${(count + 1).toString().padStart(3, '0')}`;
        const { data, error } = await supabase.from('flight_authorizations').insert([{ ...body, mission_id: missionId, organization_id: prof.organization_id, scheduled_by: user.id }]).select();
        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

// --- MÉTODO NUEVO PARA EDITAR ---
export async function PATCH(request) {
    try {
        const supabase = await createClientSSR();
        const body = await request.json();
        const { id, pilot_id, aircraft_id, location, scheduled_at, mission_type } = body;

        const { data, error } = await supabase
            .from('flight_authorizations')
            .update({
                pilot_id,
                aircraft_id,
                location,
                scheduled_at,
                mission_type,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}