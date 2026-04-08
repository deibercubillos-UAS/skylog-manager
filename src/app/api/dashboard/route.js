import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const orgId = profile?.organization_id;

        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights').select('*').eq('organization_id', orgId)
        ]);

        // GRÁFICO: Agrupar por flight_date (No created_at)
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const count = flightsRes.data?.filter(f => {
                const fDate = new Date(f.flight_date || f.created_at);
                return fDate.getMonth() === d.getMonth() && fDate.getFullYear() === d.getFullYear();
            }).length || 0;
            chartData.push({ label: months[d.getMonth()], count });
        }

        // ALERTAS: Lógica de 50 horas de mantenimiento
        const alerts = [];
        aircraftRes.data?.forEach(a => {
            const remaining = 50 - (parseFloat(a.total_hours || 0) % 50);
            if (remaining < 5) alerts.push({ type: 'CRÍTICO', msg: `MANTENIMIENTO: ${a.model}`, val: `${remaining.toFixed(1)}h restantes` });
        });

        return NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alertsCount: alerts.length
            },
            chart: chartData,
            alerts: alerts,
            recentActivity: flightsRes.data?.slice(0, 5) || []
        });
    } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}