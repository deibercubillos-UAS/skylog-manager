import { createClient } from '@/lib/supabaseServer';
import InventoryChecklistClient from './InventoryChecklistClient';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export default async function InventoryChecklistPage() {
    const supabase = await createClient();
    const ctx = await getOrgContext(supabase);
    const profile = { organization_id: ctx.orgId, role: ctx.role };

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
    const initialRelations = {};
    (defs || []).forEach(d => {
        initialLabels[d.field_number] = d.label_text;
        if (d.equipment_stock_id) initialRelations[d.field_number] = d.equipment_stock_id;
    });

    const initialData = {
        organizationId: profile?.organization_id,
        role: profile?.role,
        enabled: org?.enable_inventory_checklist ?? false,
        initialLabels,
        initialRelations,
        initialStock: stock || [],
    };

    return <InventoryChecklistClient initialData={initialData} />;
}
