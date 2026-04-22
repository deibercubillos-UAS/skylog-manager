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
        supabase.from('flights').select('total_time, mission_id, created_at').eq('organization_id', orgId),
        supabase.from('pilots').select('id, name, medical_expiry').eq('organization_id', orgId).eq('is_active', true),
        supabase.from('aircraft').select('id, model, status').eq('organization_id', orgId)
    ]);

    const totalHours = flightsRes.data?.reduce((acc, curr) => acc + (curr.total_time || 0), 0) || 0;
    
    // Alertas fluidas: mostramos alertas de cualquier piloto con médico vencido
    const today = new Date().toISOString().split('T')[0];
    const expiredMedicals = crewRes.data?.filter(p => p.medical_expiry && p.medical_expiry < today) || [];

    const initialData = {
        stats: {
            hours: totalHours.toFixed(1),
            pilotCount: crewRes.data?.length || 0,
            fleetCount: fleetRes.data?.length || 0,
            alertsCount: expiredMedicals.length
        },
        recentActivity: flightsRes.data?.slice(0, 5).map(f => ({
            id: f.id,
            mission_id: f.mission_id || 'S/N',
            pilots: { name: 'Comandante' },
            aircraft: { model: 'UAS' }
        })) || [],
        alerts: expiredMedicals.map(p => ({
            type: 'CRÍTICO',
            msg: `Médico Vencido: ${p.name}`,
            val: p.medical_expiry
        })),
        chart: [{ label: 'ACTIVIDAD', count: flightsRes.data?.length || 0 }]
    };

    return <DashboardClient initialData={initialData} userProfile={profile} />;
}