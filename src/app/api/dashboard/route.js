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

        // --- LÓGICA DE GRÁFICO RESILIENTE ---
        const monthsNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const targetMonth = (targetDate.getMonth() + 1).toString().padStart(2, '0');
            const targetYear = targetDate.getFullYear().toString();

            // Filtramos usando strings para evitar errores de zona horaria
            const count = flightsRes.data?.filter(f => {
                if (!f.flight_date) return false;
                const [fYear, fMonth] = f.flight_date.split('-');
                return fYear === targetYear && fMonth === targetMonth;
            }).length || 0;

            chartData.push({ 
                label: monthsNames[targetDate.getMonth()], 
                count: count 
            });
        }

        // --- LÓGICA DE ALERTAS ---
        const alerts = [];
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        const warningLimit = nextMonth.toISOString().split('T')[0];

        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry) {
                if (p.medical_expiry < today) alerts.push({ type: 'CRÍTICO', msg: `MÉDICO VENCIDO: ${p.name}`, val: p.medical_expiry });
                else if (p.medical_expiry < warningLimit) alerts.push({ type: 'AVISO', msg: `MÉDICO PRÓXIMO: ${p.name}`, val: p.medical_expiry });
            }
        });

        aircraftRes.data?.forEach(a => {
            const rem = 50 - (parseFloat(a.total_hours || 0) % 50);
            if (rem < 5) alerts.push({ type: 'TÉCNICO', msg: `MANTENIMIENTO: ${a.model}`, val: `${rem.toFixed(1)}h restantes` });
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