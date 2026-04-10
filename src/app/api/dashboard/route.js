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

        const [aircraftRes, pilotsRes, flightsRes, batteriesRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('organization_id', orgId),
            supabase.from('pilots').select('*').eq('organization_id', orgId),
            supabase.from('flights').select('*, pilots:pilot_id(name), aircraft:aircraft_id(model)').eq('organization_id', orgId).order('flight_date', { ascending: false }),
            supabase.from('batteries').select('*').eq('organization_id', orgId)
        ]);

        const alerts = [];
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. ESCÁNER DE AERONAVES (200h o 6 Meses)
        aircraftRes.data?.forEach(a => {
            const hours = parseFloat(a.total_hours || 0);
            const lastHours = parseFloat(a.last_maintenance_hours || 0);
            const hoursSince = hours - lastHours;
            
            const lastDate = a.last_maintenance_date ? new Date(a.last_maintenance_date) : new Date(a.created_at);
            const daysSince = Math.ceil(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));

            if (hoursSince >= 180 || daysSince >= 164) {
                alerts.push({
                    type: hoursSince >= 195 || daysSince >= 175 ? 'CRÍTICO' : 'AVISO',
                    msg: `SERVICIO: ${a.model} (${a.serial_number})`,
                    val: hoursSince >= 180 ? `${hoursSince.toFixed(1)}h acumuladas` : `${daysSince} días desde último serv.`
                });
            }
        });

        // 2. ESCÁNER DE BATERÍAS (Límite 200 Ciclos)
        batteriesRes.data?.forEach(b => {
            const cycles = parseInt(b.cycles || 0);
            if (cycles >= 160) {
                alerts.push({
                    type: cycles >= 185 ? 'CRÍTICO' : 'AVISO',
                    msg: `ENERGÍA: Batería ${b.brand} S/N: ${b.serial_number}`,
                    val: `${cycles} / 200 ciclos consumidos`
                });
            }
        });

        // 3. ESCÁNER DE PILOTOS (Médico)
        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry && p.medical_expiry < todayStr) {
                alerts.push({ type: 'CRÍTICO', msg: `MÉDICO VENCIDO: ${p.name}`, val: p.medical_expiry });
            }
        });

        return NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alertsCount: alerts.length,
                totalFlights: flightsRes.data?.length || 0
            },
            chart: [], // La lógica de gráfico se mantiene según el paso anterior
            alerts: alerts.sort((a, b) => a.type === 'CRÍTICO' ? -1 : 1),
            recentActivity: flightsRes.data?.slice(0, 5) || []
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}