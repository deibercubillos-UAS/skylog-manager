import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// Manuales de la empresa: lectura para todos los miembros de la org.
// Guard server-side: autenticado + rol con permiso de ver manuales.
export default async function ManualesLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !PERMISSIONS.canViewManuals.includes(profile.role)) redirect('/dashboard');

  return <>{children}</>;
}
