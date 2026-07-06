import { createClient } from '@/lib/supabaseServer';
import SuppliersClient from './SuppliersClient';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
    const supabase = await createClient();
    const ctx = await getOrgContext(supabase);
    const profile = { organization_id: ctx.orgId, role: ctx.role };
    const orgId = profile.organization_id;

    const [
        { data: org },
        { data: suppliers },
        { data: criteria },
        { data: audits },
    ] = await Promise.all([
        supabase.from('organizations').select('company_name, logo_url').eq('id', orgId).single(),
        supabase.from('suppliers').select('*').eq('organization_id', orgId).order('name'),
        supabase.from('supplier_audit_criteria').select('*').eq('organization_id', orgId).order('order_index'),
        supabase.from('supplier_audits').select('*, supplier:supplier_id(name, category)').eq('organization_id', orgId).order('audit_date', { ascending: false }),
    ]);

    const initialData = {
        organizationId: orgId,
        role: profile?.role,
        orgName: org?.company_name || '',
        logoUrl: org?.logo_url || null,
        suppliers: suppliers || [],
        criteria: criteria || [],
        audits: audits || [],
    };

    return <SuppliersClient initialData={initialData} />;
}
