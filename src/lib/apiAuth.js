/**
 * getOrgContext — helper compartido para todas las API routes.
 *
 * Fase 2 del refactor multi-organización: orgId/role/subscription_plan ya
 * NO se leen de profiles directo — se resuelven desde organization_members
 * para la organización ACTIVA de la cuenta (profiles.active_organization_id).
 * fullName sigue viniendo de profiles (campo de identidad, no cambia con la
 * organización). La forma de retorno es exactamente la misma de antes, para
 * que los 113 callers existentes no necesiten cambiar.
 *
 *   1. supabase.auth.getUser()                       → valida JWT (≈100ms)
 *   2. profiles + organization_members EN PARALELO   → mismo costo que antes
 */
export async function getOrgContext(supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) return { user: null, orgId: null, role: null };

    const [{ data: prof }, { data: memberships }] = await Promise.all([
        supabase.from('profiles').select('active_organization_id, full_name').eq('id', user.id).single(),
        supabase.from('organization_members').select('organization_id, role, subscription_plan').eq('user_id', user.id),
    ]);

    const membership = (memberships || []).find(m => m.organization_id === prof?.active_organization_id) ?? null;

    return {
        user,
        orgId:             membership?.organization_id  ?? null,
        role:              membership?.role              ?? null,
        subscription_plan: membership?.subscription_plan ?? 'piloto',
        fullName:          prof?.full_name               ?? null,
    };
}
