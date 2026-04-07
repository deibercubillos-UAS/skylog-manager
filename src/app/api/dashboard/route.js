import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const authHeader = request.headers.get('Authorization');

        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        // Consulta de datos en paralelo incluyendo el vínculo con battery_logs
        const [aircraftRes, pilotsRes, flightsRes] = await Promise.all([
            supabase.from('aircraft').select('*').eq('owner_id', user.id),
            supabase.from('pilots').select('*').eq('owner_id', user.id),
            supabase.from('flights')
                .select('*, pilots(name), aircraft(model), battery_logs(battery_sn)') // <-- Traemos S/N de batería
                .eq('owner_id', user.id)
                .order('flight_date', { ascending: false })
        ]);

        const aircraft = aircraftRes.data || [];
        const pilots = pilotsRes.data || [];
        const flights = flightsRes.data || [];

        // Lógica de Alertas (Simplificada para rendimiento)
        const alerts = [];
        aircraft.forEach(a => {
            const interval = a.maintenance_interval_hours || 50;
            if ((a.total_hours % interval) > (interval * 0.9)) {
                alerts.push({ id: a.id, type: 'maint', title: a.model, desc: 'Servicio técnico próximo' });
            }
        });

        return NextResponse.json({
            stats: {
                hours: aircraft.reduce((acc, a) => acc + (a.total_hours || 0), 0).toFixed(1),
                operational: `${aircraft.filter(a => a.status === 'Operativo').length}/${aircraft.length}`,
                pilots: pilots.length,
                smsAlerts: alerts.length
            },
            recentActivity: flights.slice(0, 10)
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}