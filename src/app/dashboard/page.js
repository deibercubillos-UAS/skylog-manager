import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

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

    const today = new Date().toISOString().split('T')[0];

    // 2. CONSULTAS BASADAS EN TU ESQUEMA REAL
    const [statsReq, crewReq, fleetReq, logsReq, alertsReq] = await Promise.all([
        // Sumamos total_time de la tabla 'flights'
        supabase.from('flights').select('total_time').eq('organization_id', profile.organization_id),
        // Conteo de perfiles en la organización
        supabase.from('profiles').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id),
        // Flota operativa (usando 'operational' según tu schema)
        supabase.from('aircraft').select('id', { count: 'exact' }).eq('organization_id', profile.organization_id).eq('status', 'operational'),
        // Actividad Reciente (Join con pilots y aircraft)
        supabase.from('flights')
            .select(`
                id, 
                mission_id, 
                created_at, 
                pilots (name), 
                aircraft (model)
            `)
            .eq('organization_id', profile.organization_id)
            .order('created_at', { ascending: false })
            .limit(5),
        // Alertas: Médicos vencidos en la tabla 'profiles'
        supabase.from('profiles')
            .select('full_name, medical_expiry')
            .eq('organization_id', profile.organization_id)
            .lt('medical_expiry', today)
    ]);

    // 3. Procesamiento de datos para el DashboardClient
    const totalHours = statsReq.data?.reduce((acc, curr) => acc + (curr.total_time || 0), 0) || 0;
    
    const initialData = {
        stats: {
            hours: totalHours.toFixed(1),
            pilotCount: crewReq.count || 0,
            fleetCount: fleetReq.count || 0,
            alertsCount: (alertsReq.data?.length || 0)
        },
        recentActivity: logsReq.data?.map(f => ({
            id: f.id,
            mission_id: f.mission_id || 'S/N',
            pilots: { name: f.pilots?.name || 'Piloto Externo' },
            aircraft: { model: f.aircraft?.model || 'UAS Genérico' }
        })) || [],
        alerts: alertsReq.data?.map(a => ({
            type: 'CRÍTICO',
            msg: `Licencia Médica Vencida: ${a.full_name}`,
            val: a.medical_expiry
        })) || [],
        chart: [
            { label: 'ENE', count: 0 }, { label: 'FEB', count: 0 }, { label: 'MAR', count: 0 }, 
            { label: 'ABR', count: 0 }, { label: 'MAY', count: 0 }, { label: 'JUN', count: logsReq.data?.length || 0 }
        ]
    };

    return <DashboardClient initialData={initialData} />;
}