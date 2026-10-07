// Skylog V2.0 — comisiones de socios para el superadmin (Etapa E3). GET agrupa por socio y período; POST liquida
// (marca como pagadas) las comisiones pendientes elegidas. Solo el superadmin.
import { requireSuperadmin } from '@/lib/v2/platformAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pendiente';
  const period = searchParams.get('period');

  let query = g.admin
    .from('referral_commissions')
    .select('id, period, sale_amount, commission_pct, commission_amount, status, payment_reference, created_at, paid_at, referral:referrals(id, plan, billing, partner:partners(id, name, type, parent_partner_id))')
    .order('period', { ascending: false })
    .order('created_at', { ascending: false });
  if (status !== 'all') query = query.eq('status', status);
  if (period) query = query.eq('period', period);
  const { data: rows, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const byPartner = {};
  for (const c of rows || []) {
    const partner = c.referral?.partner;
    if (!partner) continue;
    const entry = (byPartner[partner.id] ||= { partner_id: partner.id, partner_name: partner.name, partner_type: partner.type, periods: {} });
    const key = c.period || '—';
    const p = (entry.periods[key] ||= { period: key, commission_ids: [], total_sales: 0, total_commission: 0, payments_count: 0, statuses: new Set() });
    p.commission_ids.push(c.id);
    p.total_sales += Number(c.sale_amount);
    p.total_commission += Number(c.commission_amount);
    p.payments_count++;
    p.statuses.add(c.status);
  }
  const partners = Object.values(byPartner).map((bp) => ({
    ...bp,
    periods: Object.values(bp.periods).map((p) => ({ ...p, statuses: [...p.statuses] })).sort((a, b) => b.period.localeCompare(a.period)),
  }));
  const sum = (s) => (rows || []).filter((r) => r.status === s).reduce((t, r) => t + Number(r.commission_amount), 0);
  return Response.json({ partners, totals: { pending: sum('pendiente'), paid: sum('liquidada'), count: (rows || []).length } });
}

export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || !ids.length || ids.length > 1000) return Response.json({ error: 'ids requerido (lista de 1 a 1000)' }, { status: 400 });
  const { data, error } = await g.admin
    .from('referral_commissions')
    .update({ status: 'liquidada', paid_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'pendiente') // solo pendientes
    .select('id');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, liquidated: (data || []).length });
}
