import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { PERMISSIONS } from '@/lib/roles';
import { getOrgContext } from '@/lib/apiAuth';
import { isPilotoIndependiente } from '@/lib/pilotoIndependiente';

/**
 * Guardia server-side. Úsala en layout.js o page.js de rutas restringidas.
 * - Si no hay usuario autenticado → redirige a /login.
 * - Si el perfil no tiene el permiso requerido → redirige a /dashboard.
 * - `blockIndependentPilot: true` además redirige al piloto independiente
 *   (role='admin' + plan='piloto', dueño de su propia org) aunque su rol
 *   'admin' esté en la lista de `permKey` — usado por las páginas del grupo
 *   "Documentación" del sidebar, que no aplican a un piloto independiente
 *   (2026-07-07, pedido explícito del usuario).
 * - Devuelve { user, profile } para que la página pueda usarlos sin re-consultar
 *   (role/organization_id resueltos vía getOrgContext — organización activa).
 */
export async function requirePermission(permKey, { blockIndependentPilot = false } = {}) {
    const supabase = await createClient();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user) redirect('/login');

    const allowed = PERMISSIONS[permKey] || [];
    if (!ctx.role || !allowed.includes(ctx.role)) {
        redirect('/dashboard');
    }
    if (blockIndependentPilot && isPilotoIndependiente({ role: ctx.role, plan: ctx.subscription_plan })) {
        redirect('/dashboard');
    }
    return { user: ctx.user, profile: { id: ctx.user.id, role: ctx.role, organization_id: ctx.orgId } };
}