import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/maintenance/components?aircraft_id=  → histórico de cambios de componentes de una aeronave
export async function GET(request) {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const aircraftId = request.nextUrl.searchParams.get('aircraft_id');
        if (!aircraftId) return NextResponse.json({ error: 'aircraft_id requerido' }, { status: 400 });

        const { data, error } = await supabase
            .from('maintenance_components')
            .select('id,component_type,action,part_old,part_new,notes,created_at,maintenance_log_id')
            .eq('organization_id', orgId)
            .eq('aircraft_id', aircraftId)
            .order('created_at', { ascending: false })
            .limit(300);

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
