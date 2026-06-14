// GET /api/socio/reports?months=3
// Reporte de comisiones y ventas para el panel de socios.
// - Asesor: sus propias comisiones detalladas.
// - Owner de escuela: desglose por asesor + totales propios.

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function getMemberCtx(admin, userId) {
  const { data: memberships } = await admin
    .from('partner_members')
    .select('partner_id, role')
    .eq('profile_id', userId);
  if (!memberships?.length) return null;

  const primary = memberships[0];
  const { data: partner } = await admin
    .from('partners')
    .select('id, name, type, commission_pct')
    .eq('id', primary.partner_id)
    .single();
  return { membership: primary, partner };
}

async function commissionsForPartners(admin, partnerIds, since) {
  // referrals → referral_commissions join
  const { data: refs } = await admin
    .from('referrals')
    .select('id, partner_id, plan, billing, org_id')
    .in('partner_id', partnerIds);
  if (!refs?.length) return { refs: [], commissions: [] };

  const refIds = refs.map(r => r.id);
  let query = admin
    .from('referral_commissions')
    .select('id, referral_id, period, sale_amount, commission_pct, commission_amount, status, ref_payco, created_at')
    .in('referral_id', refIds)
    .order('created_at', { ascending: false });

  if (since) query = query.gte('created_at', since);

  const { data: commissions } = await query;
  return { refs, commissions: commissions || [] };
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const admin    = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const ctx = await getMemberCtx(admin, user.id);
    if (!ctx) return NextResponse.json({ error: 'No es socio' }, { status: 403 });

    const { partner, membership } = ctx;
    const monthsParam = parseInt(new URL(request.url).searchParams.get('months') || '3', 10);
    const since = monthsParam > 0
      ? new Date(Date.now() - monthsParam * 30 * 24 * 3600 * 1000).toISOString()
      : null;

    const isSchoolOwner = partner.type === 'escuela' && membership.role === 'owner';

    // IDs de partners propios (self + hijos si escuela)
    const ownPartnerIds = [partner.id];
    let advisorPartners = [];
    if (isSchoolOwner) {
      const { data: children } = await admin
        .from('partners')
        .select('id, name, status, commission_pct')
        .eq('parent_partner_id', partner.id)
        .eq('type', 'asesor');
      advisorPartners = children || [];
      advisorPartners.forEach(c => ownPartnerIds.push(c.id));
    }

    const { refs, commissions } = await commissionsForPartners(admin, ownPartnerIds, since);

    // Indexar
    const refById = {};
    refs.forEach(r => { refById[r.id] = r; });

    const comByPartner = {};
    commissions.forEach(c => {
      const ref = refById[c.referral_id];
      if (!ref) return;
      (comByPartner[ref.partner_id] ||= []).push({ ...c, ref });
    });

    // Totales del propio partner
    const ownComs     = comByPartner[partner.id] || [];
    const ownPending  = ownComs.filter(c => c.status === 'pendiente').reduce((s, c) => s + Number(c.commission_amount), 0);
    const ownPaid     = ownComs.filter(c => c.status === 'liquidada').reduce((s, c) => s + Number(c.commission_amount), 0);

    // Desglose por período para la tabla de historial propio
    const byPeriod = {};
    ownComs.forEach(c => {
      const p = c.period || '—';
      if (!byPeriod[p]) byPeriod[p] = { period: p, sales: 0, commission: 0, count: 0, status: c.status };
      byPeriod[p].sales      += Number(c.sale_amount);
      byPeriod[p].commission += Number(c.commission_amount);
      byPeriod[p].count++;
      // Si hay alguna liquidada en el período, marcar como mixto
      if (c.status !== byPeriod[p].status) byPeriod[p].status = 'mixto';
    });
    const history = Object.values(byPeriod).sort((a, b) => b.period.localeCompare(a.period));

    // Detalle completo de cada comisión (para tabla expandible)
    const detail = ownComs.map(c => ({
      id:                c.id,
      period:            c.period,
      plan:              c.ref?.plan,
      billing:           c.ref?.billing,
      sale_amount:       Number(c.sale_amount),
      commission_pct:    Number(c.commission_pct),
      commission_amount: Number(c.commission_amount),
      status:            c.status,
      ref_payco:         c.ref_payco,
      created_at:        c.created_at,
    }));

    // Desglose por asesor (solo escuela)
    const advisorBreakdown = isSchoolOwner
      ? advisorPartners.map(a => {
          const coms     = comByPartner[a.id] || [];
          const pending  = coms.filter(c => c.status === 'pendiente').reduce((s, c) => s + Number(c.commission_amount), 0);
          const paid     = coms.filter(c => c.status === 'liquidada').reduce((s, c) => s + Number(c.commission_amount), 0);
          return {
            id:             a.id,
            name:           a.name,
            status:         a.status,
            commission_pct: Number(a.commission_pct),
            total_sales:    coms.reduce((s, c) => s + Number(c.sale_amount), 0),
            commission_pending: pending,
            commission_paid:    paid,
            referrals_count: new Set(coms.map(c => c.referral_id)).size,
            payments_count:  coms.length,
          };
        })
      : [];

    return NextResponse.json({
      partner:   { id: partner.id, name: partner.name, type: partner.type, commission_pct: Number(partner.commission_pct) },
      months:    monthsParam,
      totals:    { pending: ownPending, paid: ownPaid, payments: ownComs.length },
      history,
      detail,
      advisors:  advisorBreakdown,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
