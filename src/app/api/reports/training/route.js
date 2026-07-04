import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Evaluaciones internas de capacitación (Operaciones o Mantenimiento), en un
// rango de fechas — para el reporte descargable en /dashboard/reports.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (!['operaciones', 'mantenimiento'].includes(type)) {
            return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }
        if ((from && !DATE_REGEX.test(from)) || (to && !DATE_REGEX.test(to))) {
            return NextResponse.json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        let query = supabase
            .from('training_evaluations')
            .select('evaluation_date, result, evaluator_name, notes, pilot:pilot_id(name, license_number)')
            .eq('organization_id', orgId)
            .eq('type', type)
            .order('evaluation_date', { ascending: true });

        if (from) query = query.gte('evaluation_date', from);
        if (to)   query = query.lte('evaluation_date', to);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
