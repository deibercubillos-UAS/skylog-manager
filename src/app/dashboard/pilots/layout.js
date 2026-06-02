import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// Tripulación visible para todos excepto piloto solo (pilotHidden en nav)
// Guard server-side: autenticado + en la lista de roles permitidos
export default async function PilotsLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowed = PERMISSIONS.canFly; // ['superadmin','admin','jefe_pilotos','piloto']
  if (!profile || !allowed.includes(profile.role)) redirect('/dashboard');

  return <>{children}</>;
}
