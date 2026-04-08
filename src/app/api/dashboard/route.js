import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Obtener perfil y su organización
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const orgId = profile?.organization_id;

        if (!orgId) return NextResponse.json({ stats: { hours: "0.0", fleetCount: 0, pilotCount: 0, alerts: 0 }, recentActivity: [] });

        // 2. Consultas en paralelo
        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights').select('*, pilots(name), aircraft(model)').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5)
        ]);

        // 3. Cálculo de KPIs
        const totalHours = aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0";
        
        return NextResponse.json({
            stats: {
                hours: totalHours,
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alerts: 0 // Próximamente: Lógica de vencimientos
            },
            recentActivity: flightsRes.data || []
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}