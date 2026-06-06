import { createClient } from '@/lib/supabaseServer';
import FormSettingsClient from './FormSettingsClient';

export const dynamic = 'force-dynamic';

export default async function FormSettingsPage() {
    const supabase = await createClient();

    // PASO 2: PARALELISMO TOTAL EN EL SERVIDOR (TTFB < 200ms)
    // Obtenemos todo lo necesario para el renderizado inicial antes de que el cliente cargue
    const { data: { user } } = await supabase.auth.getUser();
    
    // Obtenemos perfil y datos iniciales en una sola ráfaga
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user?.id).single();
    
    const [dronesRes, orgRes, defsRes] = await Promise.all([
        supabase.from('aircraft').select('model').eq('organization_id', profile?.organization_id),
        supabase.from('organizations').select('enable_health_check, enable_preflight, enable_briefing, company_name').eq('id', profile?.organization_id).single(),
        supabase.from('form_definitions')
            .select('*')
            .eq('organization_id', profile?.organization_id)
            .eq('form_type', 'briefing') // Tipo por defecto al cargar
            .eq('aircraft_model', 'General')
    ]);

    // Pre-mapeo de etiquetas para que el frontend no tenga que procesarlas
    const initialLabels = {};
    defsRes.data?.forEach(d => { initialLabels[d.field_number] = d.label_text; });

    const initialData = {
        organizationId: profile?.organization_id,
        models: [...new Set(dronesRes.data?.map(d => d.model))],
        healthEnabled: orgRes.data?.enable_health_check ?? true,
        preflightEnabled: orgRes.data?.enable_preflight ?? true,
        briefingEnabled: orgRes.data?.enable_briefing ?? true,
        companyName: orgRes.data?.company_name,
        initialLabels: initialLabels
    };

    return <FormSettingsClient initialData={initialData} />;
}