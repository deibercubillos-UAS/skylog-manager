// Skylog V2.0 — guardia del lado del servidor de /admin/*: solo el superadmin de la plataforma entra. La API ya lo exige
// en cada acción (`requireSuperadmin`); esto además evita servir estas pantallas a quien no corresponde.
import { redirect } from 'next/navigation';
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { isPlatformSuperadmin } from '@/lib/v2/platformAdmin';

export default async function AdminLayout({ children }) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/plataforma');
  const { memberships } = await resolveCurrentPerson(supabase, user.id);
  if (!isPlatformSuperadmin(memberships)) redirect('/inicio');
  return children;
}
