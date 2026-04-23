import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

const MANAGER_ROLES = ['superadmin', 'admin'];

export default async function UsersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: prof } = await supabase
        .from('profiles')
        .select('id, organization_id, role, full_name')
        .eq('id', user.id)
        .single();

    if (!prof || !MANAGER_ROLES.includes(prof.role)) {
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