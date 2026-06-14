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

    // Asesores hijos (solo si es owner de una escuela)
    let advisors = [];
    if (primary.role === 'owner' && partner.type === 'escuela') {
      const { data: childPartners } = await admin
        .from('partners')
        .select('id, name, status, commission_pct, free_seats_used')
        .eq('parent_partner_id', partner.id)
        .eq('type', 'asesor')
        .order('created_at', { ascending: false });

      if (childPartners?.length) {
        const childIds = childPartners.map(c => c.id);
        const [{ data: childCodes }, { data: childMembers }, { data: childRefs }] = await Promise.all([
          admin.from('partner_codes').select('partner_id, code, active').in('partner_id', childIds),
          admin.from('partner_members')
            .select('partner_id, role, profiles:profile_id(email, full_name)')
            .in('partner_id', childIds),
          admin.from('referrals').select('partner_id, status').in('partner_id', childIds),
        ]);
        const cByP = {}, mByP = {}, rByP = {};
        (childCodes   || []).forEach(c => { (cByP[c.partner_id] ||= []).push(c); });
        (childMembers || []).forEach(m => { (mByP[m.partner_id] ||= []).push(m); });
        (childRefs    || []).forEach(r => { (rByP[r.partner_id] ||= []).push(r); });
        advisors = childPartners.map(a => ({
          id: a.id, name: a.name, status: a.status,
          codes:   cByP[a.id] || [],
          members: (mByP[a.id] || []).map(m => ({ role: m.role, email: m.profiles?.email, name: m.profiles?.full_name })),
          referrals_active: (rByP[a.id] || []).filter(r => r.status === 'activa').length,
          referrals_total:  (rByP[a.id] || []).length,
        }));
      }
    }

    // Datos del propio perfil (para el tab Perfil)
    const { data: meProfile } = await admin
      .from('profiles').select('email, full_name').eq('id', user.id).maybeSingle();

    return NextResponse.json({
      member: { role: primary.role, email: meProfile?.email || user.email, name: meProfile?.full_name || null },
      partner: {
        id: partner.id, name: partner.name, type: partner.type, status: partner.status,
        commission_pct: partner.commission_pct,
        free_seats_limit: partner.free_seats_limit, free_seats_used: partner.free_seats_used,
        free_days: partner.free_days, logo_url: partner.logo_url || null,
      },
      codes: codes || [],
      advisors,
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
