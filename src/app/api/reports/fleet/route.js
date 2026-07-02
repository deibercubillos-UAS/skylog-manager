import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Inventario de flota (snapshot actual, sin rango de fechas) — opcionalmente
// acotado a una sola aeronave para la "ficha" de un solo dron.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const aircraftId = searchParams.get('aircraftId');

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        let query = supabase
            .from('aircraft')
            .select('brand,model,serial_number,ruas,mtow,total_hours,operational_status,status,last_maintenance_date')
            .eq('organization_id', orgId)
            .order('model', { ascending: true });

        if (aircraftId) query = query.eq('id', aircraftId);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
