import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json([], { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
        if (!profile?.organization_id) return NextResponse.json([]);

        // Simplificamos la consulta para evitar el Error 500 de joins complejos
        const { data, error } = await supabase
            .from('flight_authorizations')
            .select(`
                *,
                pilots:pilot_id (name),
                aircraft:aircraft_id (model)
            `)
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);

    } catch (err) {
        console.error("API Authorize Error:", err.message);
        return NextResponse.json([], { status: 500 }); // Devolvemos array vacío en lugar de nada
    }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

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