import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ProgramacionActivaClient from './ProgramacionActivaClient';

export const dynamic = 'force-dynamic';

export default async function ProgramacionActivaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!['superadmin', 'admin', 'jefe_pilotos'].includes(profile?.role)) redirect('/dashboard');

  return <ProgramacionActivaClient />;
}
