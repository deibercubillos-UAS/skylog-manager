// GET /api/socio/reports?months=3 — comisiones y ventas del panel de socios (V2, Etapa E3).
// Asesor: sus propias comisiones. Dueño de escuela: además el desglose por asesor.
import { socioContext } from '@/lib/v2/socioContext';

export const dynamic = 'force-dynamic';

const sum = (rows, status) => rows.filter((c) => c.status === status).reduce((s, c) => s + Number(c.commission_amount), 0);

export async function GET(request) {
  const c = await socioContext();
  if (c.error) return c.error;
  const { admin, primary, partner } = c;

  const months = parseInt(new URL(request.url).searchParams.get('months') || '3', 10);
  const since = months > 0 ? new Date(Date.now() - months * 30 * 86_400_000).toISOString() : null;
  const isSchoolOwner = partner.type === 'escuela' && primary.role === 'owner';

  const ownIds = [partner.id];
  let advisorPartners = [];
  if (isSchoolOwner) {
    const { data: children } = await admin.from('partners').select('id, name, status, commission_pct').eq('parent_partner_id', partner.id).eq('type', 'asesor');
    advisorPartners = children || [];
    advisorPartners.forEach((a) => ownIds.push(a.id));
  }

  const { data: refs } = await admin.from('referrals').select('id, partner_id, plan, billing, organization_id').in('partner_id', ownIds);
  const refById = Object.fromEntries((refs || []).map((r) => [r.id, r]));
  let commissions = [];
  if (refs?.length) {
    let query = admin.from('referral_commissions').select('id, referral_id, period, sale_amount, commission_pct, commission_amount, status, payment_reference, created_at').in('referral_id', refs.map((r) => r.id)).order('created_at', { ascending: false });
    if (since) query = query.gte('created_at', since);
    const { data } = await query;
    commissions = data || [];
  }

  const byPartner = {};
  commissions.forEach((x) => {
    const ref = refById[x.referral_id];
    if (ref) (byPartner[ref.partner_id] ||= []).push({ ...x, ref });
  });
  const own = byPartner[partner.id] || [];

  const byPeriod = {};
  own.forEach((x) => {
    const p = x.period || '—';
    byPeriod[p] ||= { period: p, sales: 0, commission: 0, count: 0, status: x.status };
    byPeriod[p].sales += Number(x.sale_amount);
    byPeriod[p].commission += Number(x.commission_amount);
    byPeriod[p].count++;
    if (x.status !== byPeriod[p].status) byPeriod[p].status = 'mixto';
  });

  return Response.json({
    partner: { id: partner.id, name: partner.name, type: partner.type, commission_pct: Number(partner.commission_pct) },
    months,
    totals: { pending: sum(own, 'pendiente'), paid: sum(own, 'liquidada'), payments: own.length },
    history: Object.values(byPeriod).sort((a, b) => b.period.localeCompare(a.period)),
    detail: own.map((x) => ({
      id: x.id, period: x.period, plan: x.ref?.plan, billing: x.ref?.billing, sale_amount: Number(x.sale_amount), commission_pct: Number(x.commission_pct),
      commission_amount: Number(x.commission_amount), status: x.status, payment_reference: x.payment_reference, created_at: x.created_at,
    })),
    advisors: isSchoolOwner
      ? advisorPartners.map((a) => {
          const coms = byPartner[a.id] || [];
          return {
            id: a.id, name: a.name, status: a.status, commission_pct: Number(a.commission_pct),
            total_sales: coms.reduce((s, x) => s + Number(x.sale_amount), 0),
            commission_pending: sum(coms, 'pendiente'), commission_paid: sum(coms, 'liquidada'),
            referrals_count: new Set(coms.map((x) => x.referral_id)).size, payments_count: coms.length,
          };
        })
      : [],
  });
}
