import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlanVueloLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, subscription_plan')
    .eq('id', user.id)
    .single();

  // Verificar plan en org primero, luego en profile
  const orgPlan = profile?.organization_id
    ? (await supabase
        .from('organizations')
        .select('subscription_plan')
        .eq('id', profile.organization_id)
        .single()).data?.subscription_plan
    : null;

  const plan = orgPlan || profile?.subscription_plan || 'piloto';

  // Esta página es exclusiva del plan piloto
  if (plan !== 'piloto') redirect('/dashboard/authorizations');

  return <>{children}</>;
}
