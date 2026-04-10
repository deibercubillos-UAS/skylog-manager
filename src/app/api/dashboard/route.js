import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const orgId = profile?.organization_id;

        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights')
                .select('*, pilots:pilot_id(name), aircraft:aircraft_id(model)')
                .eq('organization_id', orgId)
                .order('flight_date', { ascending: false })
        ]);

        // --- NUEVA LÓGICA DE GRÁFICO: ÚLTIMAS 7 ENTRADAS ---
        // Esto asegura que el gráfico SIEMPRE tenga barras si hay datos
        const lastFlights = flightsRes.data?.slice(0, 7).reverse() || [];
        const chartData = lastFlights.map(f => ({
            label: f.flight_date?.slice(5) || '---', // Muestra MM-DD
            count: 1 // Cada barra es un vuelo
        }));

        // Si hay pocos vuelos, rellenamos con vacíos para no romper la estética
        while (chartData.length < 7) {
            chartData.unshift({ label: '---', count: 0 });
        }

        // --- LÓGICA DE ALERTAS ---
        const alerts = [];
        const today = new Date().toISOString().split('T')[0];
        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry && p.medical_expiry < today) {
                alerts.push({ type: 'CRÍTICO', msg: `MÉDICO VENCIDO: ${p.name}`, val: p.medical_expiry });
            }
        });

        return NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alertsCount: alerts.length,
                totalFlights: flightsRes.data?.length || 0 // <--- DATO NUEVO
            },
            chart: chartData,
            alerts: alerts,
            recentActivity: flightsRes.data?.slice(0, 5) || []
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}