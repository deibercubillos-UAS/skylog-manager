import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

const MANAGER_ROLES = ['superadmin', 'admin'];

export default async function UsersPage() {
    const supabase = await createClient();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user) redirect('/login');

    const prof = { id: ctx.user.id, organization_id: ctx.orgId, role: ctx.role, full_name: ctx.fullName };

    if (!ctx.role || !MANAGER_ROLES.includes(prof.role)) {
        redirect('/dashboard');
    }

    const { data: org } = await supabase
        .from('organizations')
        .select('company_name, unique_code')
        .eq('id', prof.organization_id)
        .single();

    return (
        <UsersClient
            currentUserId={prof.id}
            currentRole={prof.role}
            organization={org || { company_name: 'Organización', unique_code: '---' }}
        />
    );
}