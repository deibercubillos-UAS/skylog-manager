// Skylog V2.0 — cupo del plan para aeronaves y baterías (los pilotos se controlan al invitar/unirse, ver
// `joinOrganization.js`). Regla de conteo del proyecto: servicio + `.select('id')` + `.length`, nunca `count: 'exact'`
// (PostgREST puede evaluarlo sin aplicar los filtros esperados).
import { PLAN_LIMITS, PLAN_LABELS } from '@/lib/v2/planLimits';

const TABLES = { aircraft: 'aircraft', batteries: 'batteries' };
const NOUNS = { aircraft: ['aeronave', 'aeronaves'], batteries: ['batería', 'baterías'] };

/** @returns {Promise<{ plan: string, limit: number|null, count: number, room: number }>} room = cuántas más caben (Infinity si es ilimitado) */
export async function orgCapacity(admin, organizationId, kind) {
  const [{ data: sub }, { data: rows }] = await Promise.all([
    admin.from('subscriptions').select('plan').eq('organization_id', organizationId).maybeSingle(),
    admin.from(TABLES[kind]).select('id').eq('organization_id', organizationId),
  ]);
  const plan = sub?.plan && PLAN_LIMITS[sub.plan] ? sub.plan : 'piloto';
  const limit = PLAN_LIMITS[plan][kind];
  const count = (rows || []).length;
  return { plan, limit, count, room: limit == null ? Infinity : Math.max(0, limit - count) };
}

export function capacityMessage(kind, cap) {
  const noun = NOUNS[kind][cap.limit === 1 ? 0 : 1];
  return `Tu plan ${PLAN_LABELS[cap.plan]} permite ${cap.limit} ${noun} y ya tienes ${cap.count}. Amplía el plan en Suscripción para agregar más.`;
}
