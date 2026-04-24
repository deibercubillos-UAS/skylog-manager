import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/roles';

/**
 * Guardia server-side. Úsala en layout.js o page.js de rutas restringidas.
 * - Si no hay usuario autenticado → redirige a /login.
 * - Si el perfil no tiene el permiso requerido → redirige a /dashboard.
 * - Devuelve { user, profile } para que la página pueda usarlos sin re-consultar.
 */
export async function requirePermission(permKey) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, organization_id')
        .eq('id', user.id)
        .single();

    const allowed = PERMISSIONS[permKey] || [];
    if (!profile || !allowed.includes(profile.role)) {
        redirect('/dashboard');
    }
    return { user, profile };
}