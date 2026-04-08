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

        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })
        ]);

        // --- LÓGICA DE GRÁFICO (Últimos 6 meses) ---
        const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const mLabel = months[d.getMonth()];
            const count = flightsRes.data?.filter(f => {
                const fDate = new Date(f.created_at);
                return fDate.getMonth() === d.getMonth() && fDate.getFullYear() === d.getFullYear();
            }).length || 0;
            last6Months.push({ label: mLabel, count });
        }

        // --- LÓGICA DE ALERTAS DE COMPLIANCE ---
        const alerts = [];
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);

        // 1. Alertas Médicas
        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry) {
                const expiry = new Date(p.medical_expiry);
                if (expiry < today) alerts.push({ type: 'CRÍTICO', msg: `Médico Vencido: ${p.name}`, val: p.medical_expiry });
                else if (expiry < nextMonth) alerts.push({ type: 'AVISO', msg: `Médico por vencer: ${p.name}`, val: p.medical_expiry });
            }
        });

        // 2. Alertas de Mantenimiento (Cada 50h por defecto)
        aircraftRes.data?.forEach(a => {
            const hours = parseFloat(a.total_hours || 0);
            const nextMaint = 50 - (hours % 50);
            if (nextMaint < 5) alerts.push({ type: 'TÉCNICO', msg: `Mantenimiento Urgente: ${a.model}`, val: `${nextMaint.toFixed(1)}h restantes` });
        });

        return NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alertsCount: alerts.length
            },
            chart: last6Months,
            alerts: alerts.slice(0, 5),
            recentActivity: flightsRes.data?.slice(0, 5) || []
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}