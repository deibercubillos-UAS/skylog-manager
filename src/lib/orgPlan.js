/**
 * getOrgPlan — plan efectivo de una organización.
 *
 * ⚠️ La tabla `organizations` NO tiene columna `subscription_plan`.
 * El plan de pago vive en la membresía del **admin** (Gerente General / dueño)
 * en `organization_members`. Los demás miembros (piloto/jefe/gsms) tienen
 * `subscription_plan='piloto'` en su propia membresía, así que NO se debe usar
 * el plan del miembro para feature-gating de la org.
 *
 * Fase 3 del refactor multi-organización: antes leía `profiles` (una cuenta =
 * una org); ahora lee `organization_members`, que es multi-org-aware — el
 * admin de una org puede a la vez ser miembro de otra con un plan distinto,
 * y esto sigue devolviendo el plan correcto para `orgId`.
 *
 * Funciona con el cliente del navegador o el SSR — las RLS de
 * `organization_members` permiten leer las propias membresías; para leer la
 * de OTRO miembro de la misma org (caso admin) se depende de que el caller
 * use un cliente con permisos suficientes (mismo patrón que ya asumía esta
 * función al leer `profiles` de otros miembros antes de esta fase).
 *
 * @param {object} supabase - cliente Supabase (browser o SSR)
 * @param {string|null} orgId
 * @param {string} fallback
 * @returns {Promise<string>} slug del plan ('piloto'|'escuadrilla'|'flota'|'enterprise')
 */
export async function getOrgPlan(supabase, orgId, fallback = 'piloto') {
  if (!orgId) return fallback;
  const { data } = await supabase
    .from('organization_members')
    .select('subscription_plan')
    .eq('organization_id', orgId)
    .eq('role', 'admin')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.subscription_plan || fallback;
}
