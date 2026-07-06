// GET  /api/admin/master/commissions?period=YYYY-MM&status=pendiente
// POST /api/admin/master/commissions { ids: [...], period, partner_id } → marca como liquidada
//
// Solo superadmin.

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

async function requireSuperadmin() {
  const supabase = await createClient();
  const admin    = createAdminClient();
  const ctx = await getOrgContext(supabase);
  if (!ctx.user) return { error: 'No autenticado', status: 401 };
  if (ctx.role !== 'superadmin') return { error: 'Acceso denegado', status: 403 };
  return { admin };
}

export async function GET(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;

  try {
    const { searchParams } = new URL(request.url);
    const filterPeriod = searchParams.get('period') || null;
    const filterStatus = searchParams.get('status') || 'pendiente';

    // Todas las comisiones con join a referral → partner
    let query = admin
      .from('referral_commissions')
      .select(`
        id, period, sale_amount, commission_pct, commission_amount, status, ref_payco, created_at,
        referrals:referral_id (
          id, plan, billing, org_id,
          partners:partner_id (
            id, name, type, parent_partner_id
          )
        )
      `)
      .order('period', { ascending: false })
      .order('created_at', { ascending: false });

    if (filterStatus && filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (filterPeriod) query = query.eq('period', filterPeriod);

    const { data: rows, error } = await query;
    if (error) throw error;

    // Agrupar por partner → período
    const byPartner = {};
    (rows || []).forEach(c => {
      const partner = c.referrals?.partners;
      if (!partner) return;
      const pid = partner.id;
      if (!byPartner[pid]) {
        byPartner[pid] = {
          partner_id:   pid,
          partner_name: partner.name,
          partner_type: partner.type,
          parent_id:    partner.parent_partner_id,
          periods: {},
        };
      }
      const period = c.period || '—';
      if (!byPartner[pid].periods[period]) {
        byPartner[pid].periods[period] = {
          period,
          commission_ids:    [],
          total_sales:       0,
          total_commission:  0,
          payments_count:    0,
          statuses:          new Set(),
        };
      }
      const p = byPartner[pid].periods[period];
      p.commission_ids.push(c.id);
      p.total_sales      += Number(c.sale_amount);
      p.total_commission += Number(c.commission_amount);
      p.payments_count++;
      p.statuses.add(c.status);
    });

    // Serializar (Set no es JSON-able)
    const result = Object.values(byPartner).map(bp => ({
      ...bp,
      periods: Object.values(bp.periods).map(p => ({
        ...p,
        statuses: [...p.statuses],
        mixed: p.statuses.size > 1,
      })).sort((a, b) => b.period.localeCompare(a.period)),
    }));

    // Totales globales
    const totals = {
      pending: (rows || []).filter(r => r.status === 'pendiente').reduce((s, r) => s + Number(r.commission_amount), 0),
      paid:    (rows || []).filter(r => r.status === 'liquidada').reduce((s, r) => s + Number(r.commission_amount), 0),
      count:   (rows || []).length,
    };

    return NextResponse.json({ partners: result, totals, rows: rows || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;

  try {
    const body = await request.json();
    const { ids, partner_id, period } = body;

    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ error: 'ids requerido (array)' }, { status: 400 });
    }

    // Opcional: si se pasa partner_id + period, validar que esas comisiones pertenezcan ahí
    const { error } = await admin
      .from('referral_commissions')
      .update({ status: 'liquidada', updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('status', 'pendiente'); // solo pendientes

    if (error) throw error;

    console.log(`[master/commissions] liquidadas ${ids.length} comisiones ${partner_id ? `partner=${partner_id}` : ''} ${period || ''}`);
    return NextResponse.json({ ok: true, liquidated: ids.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
