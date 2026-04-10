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

        // --- LÓGICA DE GRÁFICO POR MESES ---
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mIdx = d.getMonth();
            const year = d.getFullYear();

            // Filtrado por coincidencia de Mes y Año
            const count = flightsRes.data?.filter(f => {
                if (!f.flight_date) return false;
                const fDate = new Date(f.flight_date + 'T00:00:00'); // Forzamos ISO local
                return fDate.getMonth() === mIdx && fDate.getFullYear() === year;
            }).length || 0;

            chartData.push({ label: monthNames[mIdx], count });
        }

        return NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                totalFlights: flightsRes.data?.length || 0
            },
            chart: chartData,
            recentActivity: flightsRes.data?.slice(0, 5) || []
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}