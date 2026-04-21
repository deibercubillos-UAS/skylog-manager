import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = createClient();

    // 1. Obtener Usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // 2. Obtener la LLAVE MAESTRA (organization_id)
    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) redirect('/onboarding');
    const orgId = profile.organization_id;

    // 3. CONSULTAS SEGURAS (Filtradas por orgId para reforzar el RLS)
    const [statsRes, crewRes, fleetRes, recentRes] = await Promise.all([
        // Horas totales
        supabase.from('flights').select('total_time').eq('organization_id', orgId),
        // Tripulación (Solo conteo de mi empresa)
        supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', orgId),
        // Flota (Solo conteo de mi empresa)
        supabase.from('aircraft').select('id', { count: 'exact' }).eq('organization_id', orgId),
        // Actividad Reciente (Consultamos solo la tabla flights para evitar fallas de Join)
        supabase.from('flights')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(5)
    ]);

    // 4. Mapeo Seguro para el DashboardClient
    const totalHours = statsRes.data?.reduce((acc, curr) => acc + (curr.total_time || 0), 0) || 0;

    const initialData = {
        stats: {
            hours: totalHours.toFixed(1),
            pilotCount: crewRes.count || 0,
            fleetCount: fleetRes.count || 0,
            alertsCount: 0 // Lo implementaremos después de estabilizar
        },
        recentActivity: recentRes.data?.map(f => ({
            id: f.id,
            mission_id: f.mission_id || f.flight_number || 'S/N',
            pilots: { name: 'Tripulante Registrado' }, 
            aircraft: { model: 'Aeronave UAS' }
        })) || [],
        alerts: [],
        chart: [
            { label: 'MES ACTUAL', count: recentRes.data?.length || 0 }
        ]
    };

    return <DashboardClient initialData={initialData} />;
}