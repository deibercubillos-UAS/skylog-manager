import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    // COMENTAMOS ESTA LÍNEA PARA QUE NO TE MANDE A ONBOARDING
    // if (!profile?.organization_id) redirect('/onboarding');
    
    const orgId = profile?.organization_id;

    // Si no hay orgId, enviamos datos vacíos en lugar de fallar
    if (!orgId) {
        return <DashboardClient initialData={{
            stats: { hours: '0.0', pilotCount: 0, fleetCount: 0, alertsCount: 0 },
            recentActivity: [],
            alerts: [],
            chart: [{ label: 'SIN EMPRESA', count: 0 }]
        }} />;
    }

    // Si hay orgId, hacemos las consultas normales
    const [statsRes, crewRes, fleetRes, recentRes] = await Promise.all([
        supabase.from('flights').select('total_time').eq('organization_id', orgId),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('aircraft').select('id', { count: 'exact' }).eq('organization_id', orgId),
        supabase.from('flights')
            .select('id, mission_id, created_at, pilots(name), aircraft(model)')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(5)
    ]);

    const totalHours = statsRes.data?.reduce((acc, curr) => acc + (curr.total_time || 0), 0) || 0;

    return <DashboardClient initialData={{
        stats: {
            hours: totalHours.toFixed(1),
            pilotCount: crewRes.count || 0,
            fleetCount: fleetRes.count || 0,
            alertsCount: 0 
        },
        recentActivity: recentRes.data?.map(f => ({
            id: f.id,
            mission_id: f.mission_id || 'S/N',
            pilots: { name: f.pilots?.name || 'PIC' }, 
            aircraft: { model: f.aircraft?.model || 'UAV' }
        })) || [],
        alerts: [],
        chart: [{ label: 'ACTUAL', count: recentRes.data?.length || 0 }]
    }} />;
}