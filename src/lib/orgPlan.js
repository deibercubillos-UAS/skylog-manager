/**
 * getOrgPlan — plan efectivo de una organización.
 *
 * ⚠️ La tabla `organizations` NO tiene columna `subscription_plan`.
 * El plan de pago vive en el perfil del **admin** (Gerente General / dueño).
 * Los demás miembros (piloto/jefe/gsms) tienen `profile.subscription_plan='piloto'`,
 * así que NO se debe usar el plan del miembro para feature-gating de la org.
 *
 * Funciona con el cliente del navegador o el SSR — las RLS de `profiles`
 * permiten leer perfiles de la misma org.
 *
 * @param {object} supabase - cliente Supabase (browser o SSR)
 * @param {string|null} orgId
 * @param {string} fallback
 * @returns {Promise<string>} slug del plan ('piloto'|'escuadrilla'|'flota'|'enterprise')
 */
export async function getOrgPlan(supabase, orgId, fallback = 'piloto') {
  if (!orgId) return fallback;
  const { data } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('organization_id', orgId)
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.subscription_plan || fallback;
}
