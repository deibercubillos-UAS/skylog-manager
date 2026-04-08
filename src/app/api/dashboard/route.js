import { createClientSSR } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const orgId = profile?.organization_id;

        if (!orgId) return NextResponse.json({ stats: { hours: "0.0" }, chart: [], alerts: [] });

        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights').select('*').eq('organization_id', orgId)
        ]);

        // 1. Gráfico de Misiones (Últimos 6 meses reales)
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const count = flightsRes.data?.filter(f => {
                const fDate = new Date(f.created_at);
                return fDate.getMonth() === d.getMonth() && fDate.getFullYear() === d.getFullYear();
            }).length || 0;
            chartData.push({ label: months[d.getMonth()], count });
        }

        // 2. Alertas Reales (Vencimientos)
        const alerts = [];
        const today = new Date();
        const warningDate = new Date();
        warningDate.setDate(today.getDate() + 30);

        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry) {
                const expiry = new Date(p.medical_expiry);
                if (expiry < today) alerts.push({ type: 'CRÍTICO', msg: `MÉDICO VENCIDO: ${p.name}`, val: p.medical_expiry });
                else if (expiry < warningDate) alerts.push({ type: 'AVISO', msg: `MÉDICO PRÓXIMO: ${p.name}`, val: p.medical_expiry });
            }
        });

        aircraftRes.data?.forEach(a => {
            if ((a.total_hours % 50) > 45) alerts.push({ type: 'TÉCNICO', msg: `MANTENIMIENTO: ${a.model}`, val: "Cerca de 50h" });
        });

        return NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alertsCount: alerts.length
            },
            chart: chartData,
            alerts: alerts.slice(0, 5),
            recentActivity: flightsRes.data?.slice(0, 5) || []
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}