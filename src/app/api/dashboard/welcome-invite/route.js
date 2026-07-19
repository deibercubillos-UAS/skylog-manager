// GET  /api/dashboard/welcome-invite — ventana de bienvenida post-invitación
// POST /api/dashboard/welcome-invite — marca la ventana como ya mostrada
//
// Cubre los 3 orígenes de invitación sin fricción de pago:
//   - Organización / Master-con-org → tabla `invitations` (status accepted
//     o creado_manualmente — AddPilotPanel "Registro completo" nunca
//     transiciona a 'accepted', ver lib/invitations.js).
//   - Socio / Master-sin-org (regalo) → tabla `free_grants` (status
//     activado). Master-sin-org usa el mismo mecanismo con partner_id null.
//
// `welcome_shown_at` (ambas tablas) asegura que se muestre UNA sola vez.
// Nunca confía en IDs que mande el cliente — siempre re-resuelve por el
// email de la sesión, tanto para leer como para marcar.

import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { getOrgPlan } from '@/lib/orgPlan';
import { PLAN_CONFIG } from '@/lib/planLimits';

export const dynamic = 'force-dynamic';

function planLabel(planKey) {
  return (PLAN_CONFIG[planKey]?.name || 'Plan Piloto').replace(/^Plan\s+/i, '');
}

// Resuelve la invitación/regalo pendiente de bienvenida para este usuario,
// o null si no hay ninguna. Un solo lugar para GET y POST.
async function findPending(admin, { email, userId }) {
  // 1) Regalo (socio o Master sin org) — siempre plan Piloto.
  const { data: grant } = await admin
    .from('free_grants')
    .select('id, partner_id, expires_at')
    .ilike('email', email)
    .eq('status', 'activado')
    .is('welcome_shown_at', null)
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (grant) {
    let invitedByName = 'BitaFly';
    if (grant.partner_id) {
      const { data: partner } = await admin
        .from('partners').select('name').eq('id', grant.partner_id).maybeSingle();
      invitedByName = partner?.name || 'una escuela aliada';
    }
    return {
      kind: 'grant',
      recordId: grant.id,
      invitedByName,
      planLabel: planLabel('piloto'),
      expiresAt: grant.expires_at,
    };
  }

  // 2) Invitación de organización (org-admin o Master-con-org).
  const { data: memberships } = await admin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId);
  const orgIds = (memberships || []).map(m => m.organization_id);
  if (!orgIds.length) return null;

  const { data: invitation } = await admin
    .from('invitations')
    .select('id, organization_id')
    .ilike('email', email)
    .in('status', ['accepted', 'creado_manualmente'])
    .in('organization_id', orgIds)
    .is('welcome_shown_at', null)
    .order('accepted_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!invitation) return null;

  const { data: org } = await admin
    .from('organizations').select('company_name').eq('id', invitation.organization_id).maybeSingle();
  const orgPlan = await getOrgPlan(admin, invitation.organization_id, 'piloto');

  return {
    kind: 'org',
    recordId: invitation.id,
    invitedByName: org?.company_name || 'tu organización',
    planLabel: planLabel(orgPlan),
    expiresAt: null, // sin vencimiento individual — depende del plan de la org
  };
}

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user) return NextResponse.json({ show: false });

    const admin = createAdminClient();
    const email = (ctx.user.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ show: false });

    const pending = await findPending(admin, { email, userId: ctx.user.id });
    if (!pending) return NextResponse.json({ show: false });

    return NextResponse.json({ show: true, ...pending });
  } catch (err) {
    console.error('[dashboard/welcome-invite GET]', err.message);
    return NextResponse.json({ show: false });
  }
}

export async function POST() {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const admin = createAdminClient();
    const email = (ctx.user.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ success: true });

    const pending = await findPending(admin, { email, userId: ctx.user.id });
    if (!pending) return NextResponse.json({ success: true });

    const table = pending.kind === 'grant' ? 'free_grants' : 'invitations';
    await admin.from(table).update({ welcome_shown_at: new Date().toISOString() }).eq('id', pending.recordId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[dashboard/welcome-invite POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
