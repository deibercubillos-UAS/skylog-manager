import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { getOrgContext } from '@/lib/apiAuth';
import { isPilotoIndependiente } from '@/lib/pilotoIndependiente';

export const dynamic = 'force-dynamic';

// SORA no tenía ningún guard server-side (page.js es 100% client component) —
// se agrega uno mínimo, solo para bloquear al piloto independiente (pedido
// explícito del usuario, 2026-07-07: no debe tener acceso al grupo
// "Documentación" del sidebar). No se restringe el resto de roles aquí para
// no cambiar comportamiento fuera de lo pedido.
export default async function SoraLayout({ children }) {
  const supabase = await createClient();
  const ctx = await getOrgContext(supabase);
  if (!ctx.user) redirect('/login');
  if (isPilotoIndependiente({ role: ctx.role, plan: ctx.subscription_plan })) {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
