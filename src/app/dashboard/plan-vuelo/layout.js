import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { getOrgPlan } from '@/lib/orgPlan';

export const dynamic = 'force-dynamic';

export default async function PlanVueloLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, subscription_plan')
    .eq('id', user.id)
    .single();

  // Plan efectivo de la org (vive en el perfil del admin; organizations no
  // tiene columna de plan).
  const plan = await getOrgPlan(supabase, profile?.organization_id, profile?.subscription_plan || 'piloto');

  // Planear Vuelo es para el piloto independiente Y para el piloto de org.
  // Los managers de un plan pagado usan Programación.
  if (plan !== 'piloto' && profile?.role !== 'piloto') redirect('/dashboard/authorizations');

  return <>{children}</>;
}
