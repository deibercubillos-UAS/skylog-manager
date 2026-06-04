import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const pilotId = searchParams.get('pilotId');

        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        // Parallelizar: pilot y flights son independientes entre sí
        const [
            { data: pilot, error },
            { data: flights },
        ] = await Promise.all([
            supabase
                .from('pilots')
                .select('*')
                .eq('organization_id', prof.organization_id)
                .eq('id', pilotId)
                .single(),
            supabase
                .from('flights')
                .select('total_time')
                .eq('pilot_id', pilotId)
                .eq('organization_id', prof.organization_id),
        ]);

        if (error) throw error;

        const totalHours = flights?.reduce((acc, f) => acc + (parseFloat(f.total_time) || 0), 0) || 0;

        // Retornamos el piloto con el agregado de horas
        return NextResponse.json({ ...pilot, total_hours_accumulated: totalHours });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}