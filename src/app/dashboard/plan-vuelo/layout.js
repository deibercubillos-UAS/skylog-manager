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

  // Planear Vuelo quitado por completo (2026-07-20, pedido explícito del
  // usuario) — ni siquiera el piloto independiente, su única audiencia
  // restante, puede planear vuelos: solo agrega los que ya hizo (manual) o
  // los importa desde su dron. Nadie entra ya a esta ruta; redirige según el
  // rol real, igual que antes para el resto de los casos.
  const isIndependent = plan === 'piloto' && profile.role === 'admin';
  if (isIndependent) {
    redirect('/dashboard/logbook/new');
  }
  redirect(profile.role === 'piloto' ? '/dashboard/mis-vuelos' : '/dashboard/authorizations');

  return <>{children}</>;
}
