import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const pilotId = searchParams.get('pilotId');

        if (!pilotId) return NextResponse.json({ error: "ID de piloto requerido" }, { status: 400 });

        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const { data, error } = await supabase
            .from('pilots')
            .select('*')
            .eq('organization_id', prof.organization_id)
            .eq('id', pilotId)
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}