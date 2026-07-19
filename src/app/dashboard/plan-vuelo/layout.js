import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { getOrgPlan } from '@/lib/orgPlan';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export default async function PlanVueloLayout({ children }) {
  const supabase = await createClient();
  const ctx = await getOrgContext(supabase);
  if (!ctx.user) redirect('/login');

  const profile = { organization_id: ctx.orgId, role: ctx.role, subscription_plan: ctx.subscription_plan };

  // Plan efectivo de la org (vive en la membresía admin; organizations no
  // tiene columna de plan).
  const plan = await getOrgPlan(supabase, profile.organization_id, profile.subscription_plan || 'piloto');

  // Planear Vuelo es SOLO para el piloto independiente (role='admin' + plan='piloto'
  // — el piloto independiente siempre tiene ese rol, nunca 'piloto'). El piloto
  // dentro de una organización ya no planea sus propios vuelos: solo vuela lo que
  // le programan (Programación/Mis Vuelos) — ver CLAUDE.md, quitado a pedido del
  // usuario. Los managers de un plan pagado siguen usando Programación.
  const isIndependent = plan === 'piloto' && profile.role === 'admin';
  if (!isIndependent) {
    redirect(profile.role === 'piloto' ? '/dashboard/mis-vuelos' : '/dashboard/authorizations');
  }

  return <>{children}</>;
}
