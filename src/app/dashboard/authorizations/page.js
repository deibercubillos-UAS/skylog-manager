import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import MissionControlClient from './MissionControlClient';

export const dynamic = 'force-dynamic';

export default async function AuthorizePage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) redirect('/onboarding');

  const [pilotsReq, dronesReq, orgReq] = await Promise.all([
    supabase.from('pilots').select('*').eq('organization_id', profile.organization_id).eq('is_active', true).order('name'),
    supabase.from('aircraft').select('*').eq('organization_id', profile.organization_id).eq('status', 'Operativo'),
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
  ]);

  const initialData = {
    pilots: pilotsReq.data || [],
    drones: dronesReq.data || [],
    org: orgReq.data || {},
    userRole: profile.role
  };

  return <MissionControlClient initialData={initialData} />;
}