import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        // 1. Cargar todos los datos base
        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('owner_id', user.id),
            supabase.from('pilots').select('*').eq('owner_id', user.id),
            supabase.from('flights').select('*, pilots(name), aircraft(model)').eq('owner_id', user.id).order('flight_date', { ascending: false })
        ]);

        const aircraft = aircraftRes.data || [];
        const pilots = pilotsRes.data || [];
        const flights = flightsRes.data || [];

        // 2. Lógica de Gráfico (Actividad últimos 6 meses)
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const chartLabels = [];
        const chartValues = [];
        
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const mIdx = d.getMonth();
            const year = d.getFullYear();

            chartLabels.push(monthNames[mIdx]);
            
            const count = flights.filter(f => {
                const fDate = new Date(f.flight_date);
                return fDate.getMonth() === mIdx && fDate.getFullYear() === year;
            }).length;
            
            chartValues.push(count);
        }

        // 3. Lógica de Alertas Críticas (Compliance)
        const alerts = [];
        const today = new Date();
        const warningWindow = new Date();
        warningWindow.setDate(today.getDate() + 30); // Ventana de 30 días

        // Alertas Médicas (Pilotos)
        pilots.forEach(p => {
            if (p.medical_expiry) {
                const expiry = new Date(p.medical_expiry);
                if (expiry < today) {
                    alerts.push({ id: `med-${p.id}`, type: 'critical', title: p.name, desc: 'Examen Médico Vencido', val: p.medical_expiry });
                } else if (expiry < warningWindow) {
                    alerts.push({ id: `med-${p.id}`, type: 'warning', title: p.name, desc: 'Médico vence pronto', val: p.medical_expiry });
                }
            }
        });

        // Alertas de Mantenimiento (Aeronaves)
        aircraft.forEach(a => {
            const interval = a.maintenance_interval_hours || 50;
            const hoursRemaining = interval - ( (a.total_hours || 0) % interval);
            if (hoursRemaining < 5) {
                alerts.push({ id: `maint-${a.id}`, type: 'critical', title: a.model, desc: 'Mantenimiento Urgente', val: `${hoursRemaining.toFixed(1)}h para servicio` });
            }
        });

        return NextResponse.json({
            stats: {
                hours: aircraft.reduce((acc, a) => acc + (a.total_hours || 0), 0).toFixed(1),
                operational: `${aircraft.filter(a => a.status === 'Operativo').length}/${aircraft.length}`,
                pilots: pilots.length,
                alertsCount: alerts.length
            },
            chart: { labels: chartLabels, data: chartValues },
            alerts: alerts.slice(0, 5),
            recentActivity: flights.slice(0, 8)
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}