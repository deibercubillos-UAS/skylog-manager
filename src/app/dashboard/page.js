import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Obtenemos el perfil para saber la empresa (Sin bloqueos de roles)
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role, full_name')
        .eq('id', user.id)
        .single();

    const orgId = profile?.organization_id;

    // Si no hay empresa, devolvemos un estado base para no romper el dashboard
    if (!orgId) {
        return <DashboardClient initialData={{ stats: { hours: '0.0', pilotCount: 0, fleetCount: 0, alertsCount: 0 }, recentActivity: [], alerts: [], chart: [] }} />;
    }

    // CARGA TOTAL (Fluidez máxima: traemos todo lo de la empresa)
    const [flightsRes, crewRes, fleetRes] = await Promise.all([
        supabase
            .from('flights')
            .select(`
                id,
                mission_id,
                flight_date,
                takeoff_time,
                landing_time,
                total_time,
                created_at,
                pilots:pilot_id(name),
                aircraft:aircraft_id(model, serial_number)
            `)
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false }),
        supabase.from('pilots').select('id, name, medical_expiry').eq('organization_id', orgId).eq('is_active', true),
        supabase.from('aircraft').select('id, model, status, total_hours').eq('organization_id', orgId)
    ]);

    const flights = flightsRes.data || [];
    // Fuente de verdad: aircraft.total_hours (coincide con la card de cada dron)
    const totalHours = (fleetRes.data || []).reduce((acc, a) => acc + (parseFloat(a.total_hours) || 0), 0);

    // Alertas: pilotos con médico vencido
    const today = new Date().toISOString().split('T')[0];
    const expiredMedicals = crewRes.data?.filter(p => p.medical_expiry && p.medical_expiry < today) || [];

    // CHART: últimos 6 meses con conteo real de vuelos
    const now = new Date();
    const monthLabels = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    const chart = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const count = flights.filter(f => f.created_at?.startsWith(monthStr)).length;
        chart.push({ label: monthLabels[d.getMonth()], count });
    }

    const initialData = {
        stats: {
            hours: totalHours.toFixed(1),
            pilotCount: crewRes.data?.length || 0,
            fleetCount: fleetRes.data?.length || 0,
            alertsCount: expiredMedicals.length
        },
        recentActivity: flights.slice(0, 5).map(f => ({
            id: f.id,
            mission_id: f.mission_id || 'S/N',
            profiles: { full_name: f.pilots?.name || 'Sin PIC' },
            aircraft: { model: f.aircraft?.model || 'N/R' }
        })),
        alerts: expiredMedicals.map(p => ({
            type: 'CRÍTICO',
            msg: `Médico Vencido: ${p.name}`,
            val: p.medical_expiry
        })),
        chart
    }; 

    return <DashboardClient initialData={initialData} userProfile={profile} />;
}