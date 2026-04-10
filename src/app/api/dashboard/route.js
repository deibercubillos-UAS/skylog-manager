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

        if (!orgId) return NextResponse.json({ stats: { hours: "0.0" }, chart: [], alerts: [] });

        // CONSULTAS PARALELAS CON JOINS (Aquí estaba el error del resumen)
        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights')
                .select('*, pilots:pilot_id(name), aircraft:aircraft_id(model)') // <--- JOINS ACTIVADOS
                .eq('organization_id', orgId)
                .order('flight_date', { ascending: false })
        ]);

        // 1. Lógica de Gráfico (6 meses)
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mIdx = d.getMonth();
            const year = d.getFullYear();
            const count = flightsRes.data?.filter(f => {
                const fDate = new Date(f.flight_date);
                return fDate.getMonth() === mIdx && fDate.getFullYear() === year;
            }).length || 0;
            chartData.push({ label: months[mIdx], count });
        }

        // 2. Lógica de Alertas
        const alerts = [];
        const today = new Date();
        const warningWindow = new Date();
        warningWindow.setDate(today.getDate() + 30);

        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry) {
                const exp = new Date(p.medical_expiry);
                if (exp < today) alerts.push({ type: 'CRÍTICO', msg: `MÉDICO VENCIDO: ${p.name}`, val: p.medical_expiry });
                else if (exp < warningWindow) alerts.push({ type: 'AVISO', msg: `MÉDICO PRÓXIMO: ${p.name}`, val: p.medical_expiry });
            }
        });

        aircraftRes.data?.forEach(a => {
            const remaining = 50 - (parseFloat(a.total_hours || 0) % 50);
            if (remaining < 5) alerts.push({ type: 'TÉCNICO', msg: `MANTENIMIENTO: ${a.model}`, val: `${remaining.toFixed(1)}h para servicio` });
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

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}