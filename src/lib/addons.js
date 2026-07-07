// Recursos adicionales (piloto/dron extra) — comprables sin importar el plan
// contratado. Ver `addon_subscriptions` (migración 20260707_org_addons.sql)
// y CLAUDE.md ("Recursos adicionales — piloto/dron extra").

// Precios COP mensuales — fuente única (checkout, Master, UI de Suscripción).
export const ADDON_PRICING = {
  pilot: { label: 'Piloto adicional', monthly: 30000 },
  drone: { label: 'Dron adicional',   monthly: 25000 },
};

/**
 * Cuenta cuántas unidades activas de cada tipo de add-on tiene una org.
 * @param {object} supabase  cliente Supabase (admin o SSR, ambos con SELECT vía RLS propia)
 * @param {string} orgId
 * @returns {Promise<{ pilot: number, drone: number }>}
 */
export async function getOrgAddonCounts(supabase, orgId) {
  const counts = { pilot: 0, drone: 0 };
  if (!orgId) return counts;
  const { data } = await supabase
    .from('addon_subscriptions')
    .select('addon_type, quantity')
    .eq('organization_id', orgId)
    .eq('status', 'active');
  (data || []).forEach(row => {
    counts[row.addon_type] = (counts[row.addon_type] || 0) + row.quantity;
  });
  return counts;
}
