/**
 * getOrgContext — helper compartido para todas las API routes.
 *
 * Realiza 2 llamadas secuenciales inevitables (no podemos paralelizarlas
 * porque necesitamos user.id para buscar el perfil):
 *   1. supabase.auth.getUser()   → valida JWT en servidor (≈100ms)
 *   2. profiles.select(...)      → obtiene organization_id y role (≈100ms)
 *
 * Retorna { user, orgId, role } o lanza si no está autenticado.
 */
export async function getOrgContext(supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) return { user: null, orgId: null, role: null };

    const { data: prof } = await supabase
        .from('profiles')
        .select('organization_id, role, subscription_plan, full_name')
        .eq('id', user.id)
        .single();

    return {
        user,
        orgId:             prof?.organization_id  ?? null,
        role:              prof?.role              ?? null,
        subscription_plan: prof?.subscription_plan ?? 'piloto',
        fullName:          prof?.full_name          ?? null,
    };
}
