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
            supabase.from('aircraft')
                .select('id,model,serial_number,total_hours,last_maintenance_hours,last_maintenance_date,created_at')
                .eq('organization_id', orgId),
            supabase.from('pilots')
                .select('id,name,medical_expiry')
                .eq('organization_id', orgId),
            supabase.from('flights')
                .select('id,mission_id,flight_date,created_at,pilots:pilot_id(name),aircraft:aircraft_id(model)')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(500),
            supabase.from('batteries')
                .select('id,brand,serial_number,cycles')
                .eq('organization_id', orgId)
        ]);

        // --- 1. LÓGICA DE GRÁFICO MENSUAL (RECUPERADA Y MEJORADA) ---
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartData = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mIdx = d.getMonth();
            const year = d.getFullYear();

            // Filtrado por coincidencia de Mes y Año para evitar errores de zona horaria
            const count = flightsRes.data?.filter(f => {
                if (!f.flight_date) return false;
                const [fYear, fMonth] = f.flight_date.split('-');
                return parseInt(fYear) === year && parseInt(fMonth) === (mIdx + 1);
            }).length || 0;

            chartData.push({ label: monthNames[mIdx], count });
        }

        // --- 2. LÓGICA DE ALERTAS OPERATIVAS ---
        const alerts = [];
        const todayStr = new Date().toISOString().split('T')[0];
        const warningLimit = new Date();
        warningLimit.setDate(warningLimit.getDate() + 30);
        const warningStr = warningLimit.toISOString().split('T')[0];

        // Escáner de Aeronaves (200h o 6 Meses)
        aircraftRes.data?.forEach(a => {
            const hours = parseFloat(a.total_hours || 0);
            const lastHours = parseFloat(a.last_maintenance_hours || 0);
            const hoursSince = hours - lastHours;
            const lastDate = a.last_maintenance_date ? new Date(a.last_maintenance_date) : new Date(a.created_at);
            const daysSince = Math.ceil(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));

            if (hoursSince >= 180 || daysSince >= 165) {
                alerts.push({
                    type: (hoursSince >= 195 || daysSince >= 175) ? 'CRÍTICO' : 'AVISO',
                    msg: `MNT: ${a.model} (${a.serial_number})`,
                    val: hoursSince >= 180 ? `${hoursSince.toFixed(1)}h desde serv.` : `${daysSince} días desde serv.`
                });
            }
        });

        // Escáner de Baterías (200 Ciclos)
        batteriesRes.data?.forEach(b => {
            const cycles = parseInt(b.cycles || 0);
            if (cycles >= 160) {
                alerts.push({
                    type: cycles >= 185 ? 'CRÍTICO' : 'AVISO',
                    msg: `BATERÍA: ${b.brand} (${b.serial_number})`,
                    val: `${cycles} / 200 ciclos`
                });
            }
        });

        // Escáner de Pilotos (Médico)
        pilotsRes.data?.forEach(p => {
            if (p.medical_expiry) {
                if (p.medical_expiry < todayStr) {
                    alerts.push({ type: 'CRÍTICO', msg: `MÉDICO VENCIDO: ${p.name}`, val: p.medical_expiry });
                } else if (p.medical_expiry < warningStr) {
                    alerts.push({ type: 'AVISO', msg: `MÉDICO PRÓXIMO: ${p.name}`, val: p.medical_expiry });
                }
            }
        });

        const response = NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alertsCount: alerts.length,
                totalFlights: flightsRes.data?.length || 0
            },
            chart: chartData,
            alerts: alerts.sort((a, b) => a.type === 'CRÍTICO' ? -1 : 1),
            recentActivity: flightsRes.data?.slice(0, 5) || []
        });
        response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
        return response;

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}