import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { orgId } = await getOrgContext(supabase);
        if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Fecha de corte: 6 meses atrás para el gráfico mensual
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 6);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        const todayISO = new Date().toISOString().split('T')[0];

        const [aircraftRes, pilotsRes, chartFlightsRes, recentFlightsRes, batteriesRes, nextMissionRes] = await Promise.all([
            supabase.from('aircraft')
                .select('id,model,serial_number,total_hours,last_maintenance_hours,last_maintenance_date,created_at,operational_status')
                .eq('organization_id', orgId),
            supabase.from('pilots')
                .select('id,name,medical_expiry')
                .eq('organization_id', orgId),
            // Solo flight_date para el gráfico mensual (payload mínimo)
            supabase.from('flights')
                .select('flight_date')
                .eq('organization_id', orgId)
                .gte('flight_date', cutoffStr),
            // Solo 5 registros completos para "Actividad Reciente"
            supabase.from('flights')
                .select('id,mission_id,flight_date,total_time,created_at,pilots:pilot_id(name),aircraft:aircraft_id(model)')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(5),
            supabase.from('batteries')
                .select('id,brand,serial_number,cycles')
                .eq('organization_id', orgId),
            // Próxima misión programada (hoy en adelante, no cancelada) — para el banner del hero
            supabase.from('flight_authorizations')
                .select('scheduled_at,location,mission_id,plan_data')
                .eq('organization_id', orgId)
                .gte('scheduled_at', todayISO)
                .neq('status', 'cancelado')
                .order('scheduled_at', { ascending: true })
                .limit(1)
                .maybeSingle(),
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
            const count = chartFlightsRes.data?.filter(f => {
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

        // Próxima misión: la hora de despegue vive en plan_data.takeoff_time
        // (scheduled_at solo guarda la fecha — ver convención del resto del proyecto).
        const nm = nextMissionRes.data;
        const nextMission = nm ? {
            date: nm.scheduled_at,
            time: nm.plan_data?.takeoff_time || null,
            location: nm.location,
            missionId: nm.mission_id,
        } : null;

        const response = NextResponse.json({
            stats: {
                hours: aircraftRes.data?.reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0).toFixed(1) || "0.0",
                fleetCount: aircraftRes.data?.length || 0,
                fleetReadyCount: aircraftRes.data?.filter(a => a.operational_status !== 'en_mantenimiento').length || 0,
                pilotCount: pilotsRes.data?.length || 0,
                alertsCount: alerts.length,
                totalFlights: chartFlightsRes.data?.length || 0
            },
            chart: chartData,
            alerts: alerts.sort((a, b) => a.type === 'CRÍTICO' ? -1 : 1),
            recentActivity: recentFlightsRes.data || [],
            nextMission,
        });
        response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300');
        return response;

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}