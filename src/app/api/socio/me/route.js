// GET /api/socio/me — contexto del socio para el panel /socio (V2, Etapa E3). 403 si no es miembro de un socio ACTIVO.
import { socioContext } from '@/lib/v2/socioContext';

export const dynamic = 'force-dynamic';

export async function GET() {
  const c = await socioContext();
  if (c.error) return c.error;
  const { admin, primary, partner, memberships, personId, user } = c;

  // IDs visibles: el propio + (si es dueño de una escuela) los asesores que cuelgan de ella.
  const ids = new Set(memberships.map((m) => m.partner_id));
  const ownerOf = memberships.filter((m) => m.role === 'owner').map((m) => m.partner_id);
  if (ownerOf.length) {
    const { data: children } = await admin.from('partners').select('id').in('parent_partner_id', ownerOf);
    (children || []).forEach((x) => ids.add(x.id));
  }
  const all = [...ids];

  const [{ data: codes }, { data: grants }, { data: refs }, { data: me }] = await Promise.all([
    admin.from('partner_codes').select('code, active, partner_id').in('partner_id', all),
    admin.from('free_grants').select('id, status, partner_id').in('partner_id', all),
    admin.from('referrals').select('id, status, partner_id').in('partner_id', all),
    admin.from('people').select('email, full_name').eq('id', personId).maybeSingle(),
  ]);

  let commissionPending = 0;
  let commissionPaid = 0;
  const refIds = (refs || []).map((r) => r.id);
  if (refIds.length) {
    const { data: coms } = await admin.from('referral_commissions').select('commission_amount, status').in('referral_id', refIds);
    (coms || []).forEach((x) => {
      const amount = Number(x.commission_amount) || 0;
      if (x.status === 'liquidada') commissionPaid += amount;
      else if (x.status === 'pendiente') commissionPending += amount;
    });
  }

  let advisors = [];
  if (primary.role === 'owner' && partner.type === 'escuela') {
    const { data: childPartners } = await admin.from('partners').select('id, name, status, commission_pct, free_seats_used').eq('parent_partner_id', partner.id).eq('type', 'asesor').order('created_at', { ascending: false });
    if (childPartners?.length) {
      const childIds = childPartners.map((x) => x.id);
      const [{ data: childCodes }, { data: childMembers }, { data: childRefs }, { data: childInvites }] = await Promise.all([
        admin.from('partner_codes').select('partner_id, code, active').in('partner_id', childIds),
        admin.from('partner_members').select('partner_id, role, person:people(email, full_name)').in('partner_id', childIds),
        admin.from('referrals').select('partner_id, status').in('partner_id', childIds),
        admin.from('partner_invitations').select('partner_id, email, status, expires_at').in('partner_id', childIds).eq('status', 'pendiente'),
      ]);
      const group = (rows) => (rows || []).reduce((acc, r) => ((acc[r.partner_id] ||= []).push(r), acc), {});
      const cBy = group(childCodes), mBy = group(childMembers), rBy = group(childRefs), iBy = group(childInvites);
      advisors = childPartners.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        codes: cBy[a.id] || [],
        members: (mBy[a.id] || []).map((m) => ({ role: m.role, email: m.person?.email, name: m.person?.full_name })),
        pending_invitations: (iBy[a.id] || []).filter((i) => new Date(i.expires_at) > new Date()).map((i) => i.email),
        referrals_active: (rBy[a.id] || []).filter((r) => r.status === 'activa').length,
        referrals_total: (rBy[a.id] || []).length,
      }));
    }
  }

  return Response.json({
    member: { role: primary.role, email: me?.email || user.email, name: me?.full_name || null },
    partner: {
      id: partner.id, name: partner.name, type: partner.type, status: partner.status, commission_pct: partner.commission_pct,
      free_seats_limit: partner.free_seats_limit, free_seats_used: partner.free_seats_used, free_days: partner.free_days, logo_url: partner.logo_url || null,
    },
    codes: codes || [],
    advisors,
    stats: {
      grants_total: (grants || []).length,
      grants_active: (grants || []).filter((g) => g.status === 'activado').length,
      referrals_total: (refs || []).length,
      referrals_active: (refs || []).filter((r) => r.status === 'activa').length,
      commission_pending: commissionPending,
      commission_paid: commissionPaid,
    },
  });
}
