import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/maintenance/components?aircraft_id=
//   → { active: [...componentes activos con horas/días...], history: [...eventos de cambio...] }
export async function GET(request) {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const aircraftId = request.nextUrl.searchParams.get('aircraft_id');
        if (!aircraftId) return NextResponse.json({ error: 'aircraft_id requerido' }, { status: 400 });

        const [acRes, histRes, airRes] = await Promise.all([
            supabase.from('aircraft_components')
                .select('id,component_type,name,serial,installed_at,installed_at_aircraft_hours,status')
                .eq('organization_id', orgId)
                .eq('aircraft_id', aircraftId)
                .eq('status', 'activo')
                .order('component_type', { ascending: true }),
            supabase.from('maintenance_components')
                .select('id,component_type,action,part_old,part_new,notes,created_at')
                .eq('organization_id', orgId)
                .eq('aircraft_id', aircraftId)
                .order('created_at', { ascending: false })
                .limit(300),
            supabase.from('aircraft')
                .select('total_hours')
                .eq('id', aircraftId)
                .eq('organization_id', orgId)
                .single(),
        ]);

        if (acRes.error) throw acRes.error;

        const totalHours = parseFloat(airRes.data?.total_hours || 0);
        const active = (acRes.data || []).map(c => ({
            ...c,
            used_hours: Math.max(0, totalHours - parseFloat(c.installed_at_aircraft_hours || 0)),
        }));

        return NextResponse.json({ active, history: histRes.data || [] });
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
