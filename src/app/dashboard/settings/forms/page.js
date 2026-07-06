import { createClient } from '@/lib/supabaseServer';
import { isPilotoIndependiente } from '@/lib/pilotoIndependiente';
import FormSettingsClient from './FormSettingsClient';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export default async function FormSettingsPage() {
    const supabase = await createClient();

    // PASO 2: PARALELISMO TOTAL EN EL SERVIDOR (TTFB < 200ms)
    // Obtenemos todo lo necesario para el renderizado inicial antes de que el cliente cargue
    const ctx = await getOrgContext(supabase);
    const profile = { organization_id: ctx.orgId, role: ctx.role, subscription_plan: ctx.subscription_plan };

    const [dronesRes, orgRes, defsRes] = await Promise.all([
        supabase.from('aircraft').select('model').eq('organization_id', profile?.organization_id),
        supabase.from('organizations').select('enable_health_check, enable_preflight, enable_briefing, company_name, slug, unique_code').eq('id', profile?.organization_id).single(),
        supabase.from('form_definitions')
            .select('*')
            .eq('organization_id', profile?.organization_id)
            .eq('form_type', 'briefing') // Tipo por defecto al cargar
            .eq('aircraft_model', 'General')
    ]);

    // Pre-mapeo de etiquetas para que el frontend no tenga que procesarlas
    const initialLabels = {};
    defsRes.data?.forEach(d => { initialLabels[d.field_number] = d.label_text; });

    // Manuales aplica solo a organizaciones — el piloto independiente (admin + plan piloto) no lo ve.
    const showManualsLink = !isPilotoIndependiente({ role: profile?.role, plan: profile?.subscription_plan });

    const initialData = {
        organizationId: profile?.organization_id,
        models: [...new Set(dronesRes.data?.map(d => d.model))],
        healthEnabled: orgRes.data?.enable_health_check ?? true,
        preflightEnabled: orgRes.data?.enable_preflight ?? true,
        briefingEnabled: orgRes.data?.enable_briefing ?? true,
        companyName: orgRes.data?.company_name,
        orgCode: orgRes.data?.slug || orgRes.data?.unique_code,
        initialLabels: initialLabels,
        showManualsLink
    };

    return <FormSettingsClient initialData={initialData} />;
}