/**
 * POST /api/auth/join-org-additional
 *
 * Fase 5 del refactor multi-organización: solicita unir la cuenta autenticada
 * a una SEGUNDA (o enésima) organización, SIN migrar ni transferir ninguna
 * tabla operativa y SIN tocar su organización actual — a diferencia de
 * `/api/auth/join-org` (que sigue existiendo intacto, para su caso de uso
 * propio: piloto independiente que se fusiona a una empresa, con
 * transferencia de datos).
 *
 * Fase 5b (2026-08-08): no crea la membresía de inmediato — a pedido del
 * usuario, el gerente de la org destino debe aprobarla primero (y puede
 * corregir el rol si el solicitante lo puso mal) antes de que quede activa.
 * Se crea una fila `pilots` con invitation_status='solicitud_pendiente'
 * (visible en Tripulación) + notificación a GG/JP; la membresía real en
 * `organization_members` solo se crea al aprobar
 * (POST /api/pilots/[id]/approve-join).
 *
 * Body: { nit: string, role: 'piloto' | 'jefe_pilotos' | 'gerente_sms' }
 */
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { JOINABLE_ROLES } from '@/app/api/auth/validate-join/route';
import { PLAN_CONFIG } from '@/lib/planLimits';
import { createNotifications } from '@/lib/notify';

const ROLE_LABEL = { piloto: 'Piloto', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS' };

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { nit: rawNit, role } = body;

    if (!rawNit) return NextResponse.json({ error: 'NIT requerido.' }, { status: 400 });
    if (!role || !JOINABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rol no válido para unirse a una organización.' }, { status: 400 });
    }

    const nit = String(rawNit).replace(/[\s\-.]/g, '').toUpperCase();

    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const admin = createAdminClient();

    // ── Buscar org destino — por NIT (tax_id) y respaldo unique_code ──────────
    let { data: targetOrg } = await admin
      .from('organizations')
      .select('id, company_name, unique_code')
      .eq('tax_id', nit)
      .maybeSingle();
    if (!targetOrg) {
      ({ data: targetOrg } = await admin
        .from('organizations')
        .select('id, company_name, unique_code')
        .eq('unique_code', nit)
        .maybeSingle());
    }

    if (!targetOrg) {
      return NextResponse.json({
        error: 'No se encontró ninguna organización con ese NIT. Verifica con tu gerente.',
      }, { status: 404 });
    }

    // ── Ya es miembro de esa organización ──────────────────────────────────
    const { data: existingMembership } = await admin
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', targetOrg.id)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ error: 'Ya perteneces a esa organización.' }, { status: 400 });
    }

    // ── Ya tiene una solicitud pendiente para esa org ──────────────────────
    const { data: existingRequest } = await admin
      .from('pilots')
      .select('id, invitation_status')
      .eq('organization_id', targetOrg.id)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (existingRequest?.invitation_status === 'solicitud_pendiente') {
      return NextResponse.json({ error: 'Ya tienes una solicitud pendiente de aprobación para esa organización.' }, { status: 400 });
    }

    // ── Verificar disponibilidad del rol (por org destino) ────────────────────
    const UNIQUE_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms'];

    if (UNIQUE_ROLES.includes(role)) {
      const { data: existing } = await admin
        .from('organization_members')
        .select('id')
        .eq('organization_id', targetOrg.id)
        .eq('role', role)
        .maybeSingle();

      if (existing) {
        const labels = { jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS' };
        return NextResponse.json({
          error: `El rol "${labels[role] || role}" ya está ocupado en esa organización.`,
        }, { status: 409 });
      }
    }

    if (role === 'piloto') {
      const { data: adminMembership } = await admin
        .from('organization_members')
        .select('subscription_plan')
        .eq('organization_id', targetOrg.id)
        .eq('role', 'admin')
        .maybeSingle();

      const planKey = adminMembership?.subscription_plan || 'piloto';
      const planConfig = PLAN_CONFIG[planKey] || PLAN_CONFIG.piloto;

      if (planConfig.maxPilots !== null && planConfig.maxPilots !== undefined) {
        // Admin client (service role) ya bypassa RLS por diseño — count:'exact'/head:true
        // es seguro y correcto aquí (a diferencia de la Regla de conteo del proyecto, que
        // aplica al cliente REGULAR, donde PostgREST puede ignorar filtros RLS bajo head:true).
        const { count: pilotosCount } = await admin
          .from('organization_members')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', targetOrg.id)
          .eq('role', 'piloto');

        if ((pilotosCount ?? 0) >= planConfig.maxPilots) {
          return NextResponse.json({
            error: `La organización alcanzó el límite de pilotos del plan. El gerente debe actualizar el plan.`,
          }, { status: 409 });
        }
      }
    }

    // ── Crear/reactivar la solicitud pendiente — sin transferir datos ni tocar
    //    la org actual ni crear la membresía todavía (queda a la aprobación
    //    del gerente, ver POST /api/pilots/[id]/approve-join) ────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name, full_name')
      .eq('id', user.id)
      .maybeSingle();
    const name = profile?.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user.email;

    const pilotRow = {
      organization_id: targetOrg.id,
      profile_id: user.id,
      owner_id: user.id,
      name,
      email: user.email,
      pilot_role: ROLE_LABEL[role] || 'Piloto',
      invitation_status: 'solicitud_pendiente',
    };

    let pilotId = existingRequest?.id;
    if (pilotId) {
      const { error: updErr } = await admin.from('pilots').update(pilotRow).eq('id', pilotId);
      if (updErr) throw updErr;
    } else {
      const { data: inserted, error: insErr } = await admin.from('pilots').insert(pilotRow).select('id').single();
      if (insErr) throw insErr;
      pilotId = inserted.id;
    }

    try {
      await createNotifications({
        orgId: targetOrg.id,
        roles: ['admin', 'jefe_pilotos'],
        type: 'join_request',
        title: 'Solicitud de unión a la organización',
        body: `${name} solicitó unirse como ${ROLE_LABEL[role] || role}. Revisa y aprueba el rol en Tripulación.`,
        link: '/dashboard/pilots',
        actorId: user.id,
        metadata: { pilot_id: pilotId },
      });
    } catch (notifyErr) {
      console.error('[join-org-additional] notify', notifyErr.message);
    }

    return NextResponse.json({
      success: true,
      pending: true,
      orgId: targetOrg.id,
      orgName: targetOrg.company_name,
      message: `Tu solicitud fue enviada a ${targetOrg.company_name}. Un gerente debe aprobarla antes de que quede activa. Tu cuenta independiente sigue intacta mientras tanto.`,
    });

  } catch (err) {
    console.error('[join-org-additional]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
