import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient'; // El archivo con tu diseño

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = createClient();

    // 1. Validar Usuario y Organización
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) redirect('/onboarding');

    // 2. PARALELISMO TOTAL: Traemos todo lo que tu diseño necesita
    const [statsReq, pilotsReq, fleetReq, logsReq] = await Promise.all([
        // Horas de vuelo (Sumamos duration_minutes de la tabla flight_logs)
        supabase.from('flight_logs').select('duration_minutes').eq('organization_id', profile.organization_id),
        // Conteo de tripulación
        supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id),
        // Conteo de aeronaves
        supabase.from('aircraft').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id),
        // Actividad reciente (Con joins para que aparezcan nombres de pilotos y drones)
        supabase.from('flight_logs')
            .select('id, mission_id, created_at, pilots(full_name), aircraft(model)')
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false })
            .limit(5)
    ]);

    // 3. Procesar estadísticas para tu frontend
    const totalMinutes = statsReq.data?.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0) || 0;
    
    const dashboardData = {
        stats: {
            hours: (totalMinutes / 60).toFixed(1),
            pilotCount: pilotsReq.count || 0,
            fleetCount: fleetReq.count || 0,
            alertsCount: 0 // Aquí puedes sumar lógica de alertas si tienes tabla
        },
        recentActivity: logsReq.data || [],
        // Generamos un gráfico vacío o con datos si tienes por mes
        chart: [
            { label: 'ENE', count: 0 }, { label: 'FEB', count: 0 }, { label: 'MAR', count: 0 }, 
            { label: 'ABR', count: 0 }, { label: 'MAY', count: 0 }, { label: 'JUN', count: 2 }
        ],
        alerts: [] // Mantenemos tu estructura de alertas
    };

    // Le pasamos los datos a tu frontend robusto
    return <DashboardClient initialData={dashboardData} />;
}