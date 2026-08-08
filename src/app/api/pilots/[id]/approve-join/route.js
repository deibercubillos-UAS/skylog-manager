/**
 * POST /api/pilots/[id]/approve-join
 *
 * Aprueba una solicitud de unión de un piloto independiente (creada por
 * POST /api/auth/join-org-additional, fila `pilots` con
 * invitation_status='solicitud_pendiente') — recién aquí se crea la
 * membresía real en organization_members. El gerente puede corregir el rol
 * que el solicitante pidió antes de aprobar (body.role).
 *
 * Body: { role?: 'piloto' | 'jefe_pilotos' | 'gerente_sms' } — si se omite,
 * se usa el rol ya solicitado (resuelto desde pilots.pilot_role).
 */
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { JOINABLE_ROLES } from '@/app/api/auth/validate-join/route';
import { PLAN_CONFIG } from '@/lib/planLimits';
import { createNotifications } from '@/lib/notify';

const LABEL_TO_ROLE = { 'Piloto': 'piloto', 'Jefe de Pilotos': 'jefe_pilotos', 'Gerente SMS': 'gerente_sms' };
const ROLE_LABEL = { piloto: 'Piloto', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS' };

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user || !ctx.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!PERMISSIONS.canChangeRoles.includes(ctx.role)) {
      return NextResponse.json({ error: 'No tienes permiso para aprobar solicitudes.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const admin = createAdminClient();

    const { data: pilot, error: pErr } = await admin
      .from('pilots')
      .select('id, profile_id, name, pilot_role, invitation_status, organization_id')
      .eq('id', id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!pilot || pilot.invitation_status !== 'solicitud_pendiente' || !pilot.profile_id) {
      return NextResponse.json({ error: 'Solicitud no encontrada o ya resuelta.' }, { status: 404 });
    }

    const role = body.role && JOINABLE_ROLES.includes(body.role)
      ? body.role
      : (LABEL_TO_ROLE[pilot.pilot_role] || 'piloto');

    // ── Re-validar disponibilidad del rol y límite de plan (pudieron cambiar
    //    desde que se creó la solicitud) ────────────────────────────────────
    if (['jefe_pilotos', 'gerente_sms'].includes(role)) {
      const { data: existing } = await admin
        .from('organization_members')
        .select('id')
        .eq('organization_id', ctx.orgId)
        .eq('role', role)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: `El rol "${ROLE_LABEL[role]}" ya está ocupado en la organización.` }, { status: 409 });
      }
    }

    if (role === 'piloto') {
      const planConfig = PLAN_CONFIG[ctx.subscription_plan] || PLAN_CONFIG.piloto;
      if (planConfig.maxPilots !== null && planConfig.maxPilots !== undefined) {
        const { count: pilotosCount } = await admin
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', ctx.orgId)
          .eq('role', 'piloto');
        if ((pilotosCount ?? 0) >= planConfig.maxPilots) {
          return NextResponse.json({ error: 'La organización alcanzó el límite de pilotos del plan.' }, { status: 409 });
        }
      }
    }

    // ── Ya es miembro (carrera con otra solicitud/invitación) ──────────────
    const { data: existingMembership } = await admin
      .from('organization_members')
      .select('id')
      .eq('user_id', pilot.profile_id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle();
    if (existingMembership) {
      return NextResponse.json({ error: 'Ese usuario ya es miembro de la organización.' }, { status: 400 });
    }

    const { error: insErr } = await admin
      .from('organization_members')
      .insert({ user_id: pilot.profile_id, organization_id: ctx.orgId, role, subscription_plan: 'piloto' });
    if (insErr) throw insErr;

    const { error: updErr } = await admin
      .from('pilots')
      .update({ invitation_status: 'accepted', pilot_role: ROLE_LABEL[role] })
      .eq('id', id);
    if (updErr) throw updErr;

    try {
      await createNotifications({
        orgId: ctx.orgId,
        profileIds: [pilot.profile_id],
        type: 'join_request',
        title: 'Tu solicitud fue aprobada',
        body: `Te uniste a la organización como ${ROLE_LABEL[role]}.`,
        link: '/dashboard',
        actorId: ctx.user.id,
      });
    } catch (notifyErr) {
      console.error('[approve-join] notify', notifyErr.message);
    }

    return NextResponse.json({ success: true, role });
  } catch (err) {
    console.error('[approve-join]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
