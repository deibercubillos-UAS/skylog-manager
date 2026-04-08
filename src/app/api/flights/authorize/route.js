import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
        if (!profile?.organization_id) throw new Error("Usuario no vinculado a una empresa.");

        const body = await request.json();
        const { data, error } = await supabase.from('flight_authorizations').insert([{
            ...body,
            organization_id: profile.organization_id,
            scheduled_by: user.id
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

    const { data, error } = await supabase.from('flight_authorizations')
        .select('*, pilots(name), aircraft(model)')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
    return NextResponse.json(data || []);
}
