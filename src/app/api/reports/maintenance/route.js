import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Historial de mantenimiento — opcionalmente acotado a un rango de fechas y/o
// a una sola aeronave ("solo mantenimiento de una aeronave").
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const aircraftId = searchParams.get('aircraftId');

        if ((from && !DATE_REGEX.test(from)) || (to && !DATE_REGEX.test(to))) {
            return NextResponse.json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        let query = supabase
            .from('maintenance_logs')
            .select('maintenance_date,maintenance_type,description,hours_at_service,technician_name,created_at,aircraft:aircraft_id(model,serial_number)')
            .eq('organization_id', orgId)
            .order('maintenance_date', { ascending: true });

        if (from) query = query.gte('maintenance_date', from);
        if (to)   query = query.lte('maintenance_date', to);
        if (aircraftId) query = query.eq('aircraft_id', aircraftId);

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
