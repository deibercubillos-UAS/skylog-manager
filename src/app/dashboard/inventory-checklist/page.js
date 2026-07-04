import { createClient } from '@/lib/supabaseServer';
import InventoryChecklistClient from './InventoryChecklistClient';

export const dynamic = 'force-dynamic';

export default async function InventoryChecklistPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user?.id).single();

    const [{ data: org }, { data: defs }, { data: stock }] = await Promise.all([
        supabase.from('organizations').select('enable_inventory_checklist').eq('id', profile?.organization_id).single(),
        supabase.from('form_definitions')
            .select('*')
            .eq('organization_id', profile?.organization_id)
            .eq('form_type', 'inventory')
            .eq('aircraft_model', 'General')
            .order('field_number', { ascending: true }),
        supabase.from('equipment_stock')
            .select('*')
            .eq('organization_id', profile?.organization_id)
            .order('name', { ascending: true }),
    ]);

    const initialLabels = {};
    (defs || []).forEach(d => { initialLabels[d.field_number] = d.label_text; });

    const initialData = {
        organizationId: profile?.organization_id,
        role: profile?.role,
        enabled: org?.enable_inventory_checklist ?? false,
        initialLabels,
        initialStock: stock || [],
    };

    return <InventoryChecklistClient initialData={initialData} />;
}
