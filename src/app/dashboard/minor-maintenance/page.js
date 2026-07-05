import { createClient } from '@/lib/supabaseServer';
import MinorMaintenanceClient from './MinorMaintenanceClient';

export const dynamic = 'force-dynamic';

export default async function MinorMaintenancePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user?.id).single();
    const orgId = profile?.organization_id;

    const [{ data: defs }, { data: aircraft }, { data: logs }] = await Promise.all([
        supabase.from('form_definitions')
            .select('*')
            .eq('organization_id', orgId)
            .eq('form_type', 'minor_maintenance')
            .eq('aircraft_model', 'General')
            .order('field_number', { ascending: true }),
        supabase.from('aircraft')
            .select('id, model, serial_number, total_hours, operational_status, status, minor_maintenance_interval_hours, minor_maintenance_interval_days, last_minor_maintenance_date, last_minor_maintenance_hours, minor_maintenance_due')
            .eq('organization_id', orgId)
            .neq('status', 'Baja')
            .order('model'),
        supabase.from('maintenance_logs')
            .select('id, aircraft_id, maintenance_date, technician_name, description')
            .eq('organization_id', orgId)
            .eq('maintenance_type', 'MENOR')
            .order('maintenance_date', { ascending: false })
            .limit(20),
    ]);

    const initialLabels = {};
    (defs || []).forEach(d => { initialLabels[d.field_number] = d.label_text; });

    const initialData = {
        organizationId: orgId,
        role: profile?.role,
        initialLabels,
        aircraft: aircraft || [],
        recentLogs: logs || [],
    };

    return <MinorMaintenanceClient initialData={initialData} />;
}
