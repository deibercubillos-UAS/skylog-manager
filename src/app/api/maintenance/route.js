import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data, error } = await supabase
            .from('maintenance_logs')
            .select('id,aircraft_id,maintenance_type,description,hours_at_service,technician_name,created_at,aircraft:aircraft_id(model,serial_number)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) throw error;

        const res = NextResponse.json(data || []);
        res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
        return res;
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const today = new Date().toISOString().split('T')[0];

        // 1. Registrar el Mantenimiento (compatibilidad con columnas legadas)
        const { data: log, error: mErr } = await supabase.from('maintenance_logs').insert([{
            aircraft_id: body.aircraft_id,
            maintenance_type: body.maintenance_type,
            description: body.description,
            hours_at_service: body.hours_at_service,
            technician_name: body.technician_name,
            organization_id: orgId
        }]).select().single();

        if (mErr) throw mErr;

        // 2. REINICIAR CONTADORES EN EL DRONE (con filtro de org para evitar cross-tenant)
        await supabase.from('aircraft').update({
            last_maintenance_date: today,
            last_maintenance_hours: body.hours_at_service
        }).eq('id', body.aircraft_id).eq('organization_id', orgId);

        return NextResponse.json(log);
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
