import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/socio/me — contexto del socio para el panel /socio.
// Devuelve 403 si el usuario no es miembro de ningún socio.
export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Membresías del usuario
    const { data: memberships } = await admin
      .from('partner_members')
      .select('id, role, partner_id')
      .eq('profile_id', user.id);

    if (!memberships?.length) {
      return NextResponse.json({ error: 'No es socio' }, { status: 403 });
    }

    // Socio principal = primera membresía (típicamente única)
    const primary = memberships[0];

    // IDs visibles: el propio + (si es owner) los asesores hijos
    const visibleIds = new Set(memberships.map(m => m.partner_id));
    const ownerOf = memberships.filter(m => m.role === 'owner').map(m => m.partner_id);
    if (ownerOf.length) {
      const { data: children } = await admin
        .from('partners').select('id').in('parent_partner_id', ownerOf);
      (children || []).forEach(c => visibleIds.add(c.id));
    }
    const ids = [...visibleIds];

    const [{ data: partner }, { data: codes }, { data: grants }, { data: refs }] = await Promise.all([
      admin.from('partners').select('*').eq('id', primary.partner_id).single(),
      admin.from('partner_codes').select('code, active, partner_id').in('partner_id', ids),
      admin.from('free_grants').select('id, status, partner_id').in('partner_id', ids),
      admin.from('referrals').select('id, status, partner_id').in('partner_id', ids),
    ]);

    // Comisiones pendientes/liquidadas de esos referidos
    let commissionPending = 0, commissionPaid = 0;
    const refIds = (refs || []).map(r => r.id);
    if (refIds.length) {
      const { data: coms } = await admin
        .from('referral_commissions').select('commission_amount, status').in('referral_id', refIds);
      (coms || []).forEach(c => {
        const amt = Number(c.commission_amount) || 0;
        if (c.status === 'liquidada') commissionPaid += amt;
        else if (c.status === 'pendiente') commissionPending += amt;
      });
    }

    return NextResponse.json({
      member: { role: primary.role },
      partner: {
        id: partner.id, name: partner.name, type: partner.type, status: partner.status,
        commission_pct: partner.commission_pct,
        free_seats_limit: partner.free_seats_limit, free_seats_used: partner.free_seats_used,
        free_days: partner.free_days,
      },
      codes: codes || [],
      stats: {
        grants_total:    (grants || []).length,
        grants_active:   (grants || []).filter(g => g.status === 'activado').length,
        referrals_total: (refs || []).length,
        referrals_active:(refs || []).filter(r => r.status === 'activa').length,
        commission_pending: commissionPending,
        commission_paid:    commissionPaid,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
