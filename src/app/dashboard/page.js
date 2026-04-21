import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 1. Obtener mi empresa
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    const orgId = profile?.organization_id;
    if (!orgId) return <div>Error: No tienes empresa asignada. Contacta a soporte.</div>;

    // 2. Carga directa de conteos (Aeronáutico)
    const [crew, fleet, logRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('flights').select('total_time').eq('organization_id', orgId)
    ]);

    const totalHours = logRes.data?.reduce((acc, curr) => acc + (curr.total_time || 0), 0) || 0;

    const initialData = {
        stats: {
            hours: totalHours.toFixed(1),
            pilotCount: crew.count || 0,
            fleetCount: fleet.count || 0,
            alertsCount: 0
        },
        recentActivity: [],
        alerts: [],
        chart: [{ label: 'ACTUAL', count: 0 }]
    };

    return <DashboardClient initialData={initialData} />;
}