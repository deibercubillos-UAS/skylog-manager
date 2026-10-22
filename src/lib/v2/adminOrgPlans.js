// Skylog V2.0 — plan, límites efectivos y uso de varias organizaciones a la vez, para el panel del superadmin
// (pestañas Organizaciones y Cuentas). Solo servidor (cliente de servicio). Conteo: `.select(...)` + longitud, como el
// resto del proyecto (planCapacity.js).
import { crewCountsForLimit, limitsForSubscription } from '@/lib/v2/planLimits';

/** @returns {Promise<Record<string, { subscription: object|null, members: number, usage: Record<'pilots'|'aircraft'|'batteries', {count: number, limit: number|null}> }>>} */
export async function loadOrgPlans(admin, orgIds) {
  if (!orgIds.length) return {};
  const [subs, members, aircraft, batteries] = await Promise.all([
    admin.from('subscriptions').select('*').in('organization_id', orgIds),
    admin.from('memberships').select('organization_id, role').in('organization_id', orgIds).eq('status', 'activa'),
    admin.from('aircraft').select('organization_id').in('organization_id', orgIds),
    admin.from('batteries').select('organization_id').in('organization_id', orgIds),
  ]);
  const count = (rows, keep = () => true) => (rows || []).reduce((a, r) => (keep(r) ? ((a[r.organization_id] = (a[r.organization_id] || 0) + 1), a) : a), {});
  const subBy = Object.fromEntries((subs.data || []).map((s) => [s.organization_id, s]));
  const mBy = count(members.data);
  const crewBy = count(members.data, (m) => crewCountsForLimit(m.role));
  const aBy = count(aircraft.data);
  const bBy = count(batteries.data);
  return Object.fromEntries(orgIds.map((id) => {
    const sub = subBy[id] || null;
    const { limits } = limitsForSubscription(sub);
    return [id, {
      subscription: sub && {
        plan: sub.plan, billing: sub.billing, expires_at: sub.expires_at, payment_provider: sub.payment_provider, notes: sub.notes,
        limits_override: sub.limits_override ?? null,
      },
      members: mBy[id] || 0,
      usage: {
        pilots: { count: crewBy[id] || 0, limit: limits.pilots },
        aircraft: { count: aBy[id] || 0, limit: limits.aircraft },
        batteries: { count: bBy[id] || 0, limit: limits.batteries },
      },
    }];
  }));
}
