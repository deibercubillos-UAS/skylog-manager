import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const { data, error } = await supabase
            .from('flight_authorizations')
            .select('*, pilots:pilot_id (name), aircraft:aircraft_id (model)')
            .eq('organization_id', prof.organization_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) { return NextResponse.json([], { status: 500 }); }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('flight_prefix').eq('id', prof.organization_id).single();

        const body = await request.json();
        const currentPrefix = org.flight_prefix || 'BIT';

        // 1. Contar misiones que empiecen con el prefijo actual para esta organización
        const { count } = await supabase
            .from('flight_authorizations')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', prof.organization_id)
            .ilike('mission_id', `${currentPrefix}-%`);

        const nextNumber = (count + 1).toString().padStart(3, '0');
        const finalMissionId = `${currentPrefix}-${nextNumber}`;

        const { data, error } = await supabase.from('flight_authorizations').insert([{
            ...body,
            mission_id: finalMissionId,
            organization_id: prof.organization_id,
            scheduled_by: user.id,
            status: 'autorizado'
        }]).select();

        if (error) throw error;
        return NextResponse.json(data[0]);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}