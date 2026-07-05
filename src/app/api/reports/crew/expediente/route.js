import { createClientSSR } from '@/lib/supabaseServer';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const pilotId = searchParams.get('pilotId');

        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
        if (!prof || !PERMISSIONS.canViewAudit.includes(prof.role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        // Parallelizar: pilot, flights y evaluaciones de capacitación son independientes entre sí
        const [
            { data: pilot, error },
            { data: flights },
            { data: trainingEvaluations },
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
            supabase
                .from('training_evaluations')
                .select('type, evaluation_date, result, evaluator_name')
                .eq('pilot_id', pilotId)
                .eq('organization_id', prof.organization_id)
                .order('evaluation_date', { ascending: false }),
        ]);

        if (error) throw error;

        const totalHours = flights?.reduce((acc, f) => acc + (parseFloat(f.total_time) || 0), 0) || 0;

        // Retornamos el piloto con el agregado de horas + evaluaciones de capacitación
        return NextResponse.json({ ...pilot, total_hours_accumulated: totalHours, training_evaluations: trainingEvaluations || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}