// GET /api/invitations/pending
// Devuelve las invitaciones pendientes para el email del usuario autenticado.
// Es la fuente del banner de invitaciones en el dashboard.
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ invitations: [] });

    const email = (user.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ invitations: [] });

    const admin = createAdminClient();
    const { data: invs } = await admin
      .from('invitations')
      .select('id, token, role, organization_id, created_at')
      .ilike('email', email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!invs?.length) return NextResponse.json({ invitations: [] });

    // No mostrar invitación a ninguna org de la que el usuario YA es miembro
    // (cualquier membresía, no solo la activa — organization_members es la
    // fuente real de a qué orgs pertenece la cuenta).
    const { data: memberships } = await admin
      .from('organization_members').select('organization_id').eq('user_id', user.id);
    const myOrgIds = new Set((memberships || []).map(m => m.organization_id));

    const orgIds = [...new Set(invs.map(i => i.organization_id))];
    const { data: orgs } = await admin
      .from('organizations').select('id, company_name').in('id', orgIds);
    const orgName = {};
    (orgs || []).forEach(o => { orgName[o.id] = o.company_name; });

    const invitations = invs
      .filter(i => !myOrgIds.has(i.organization_id))
      .map(i => ({
        id:        i.id,
        token:     i.token,
        role:      i.role,
        orgId:     i.organization_id,
        orgName:   orgName[i.organization_id] || 'una organización',
        createdAt: i.created_at,
      }));

    return NextResponse.json({ invitations });
  } catch (err) {
    console.error('[invitations/pending]', err.message);
    return NextResponse.json({ invitations: [] });
  }
}
