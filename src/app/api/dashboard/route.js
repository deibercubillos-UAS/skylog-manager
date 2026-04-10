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

        if (!orgId) return NextResponse.json({ error: "No Org" });

        // Consultas paralelas para máxima velocidad
        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights').select('*').eq('organization_id', orgId).order('flight_date', { ascending: false })
        ]);

        // 1. LÓGICA DE GRÁFICO (Últimos 6 meses operativos)
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mIdx = d.getMonth();
            const year = d.getFullYear();

            const count = flightsRes.data?.filter(f => {
                const fDate = new Date(f.flight_date || f.created_at);
                return fDate.getMonth() === mIdx && fDate.getFullYear() === year;
            }).length || 0;

            chartData.push({ label: months[mIdx], count: count });
        }

        // 2. LÓGICA DE ALERTAS (Compliance)
        const alerts = [];
        const today = new Date();
        const warningWindow = new Date();
        warningWindow.setDate(today.getDate() + 30); // Ventana de 30 días para avisos

        // Escaneo de Pilotos (Vencimientos Médicos)
        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry) {
                const expiry = new Date(p.medical_expiry);
                if (expiry < today) {
                    alerts.push({ type: 'CRÍTICO', msg: `MÉDICO VENCIDO: ${p.name}`, val: p.medical_expiry });
                } else if (expiry < warningWindow) {
                    alerts.push({ type: 'AVISO', msg: `MÉDICO POR VENCER: ${p.name}`, val: p.medical_expiry });
                }
            }
        });

        // Escaneo de Aeronaves (Mantenimiento cada 50h)
        aircraftRes.data?.forEach(a => {
            const hours = parseFloat(a.total_hours || 0);
            const remaining = 50 - (hours % 50);
            if (remaining < 5) {
                alerts.push({ type: 'TÉCNICO', msg: `MANTENIMIENTO: ${a.model}`, val: `${remaining.toFixed(1)}h para servicio` });
            }
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