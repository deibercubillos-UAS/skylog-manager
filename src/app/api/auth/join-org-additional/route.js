/**
 * POST /api/auth/join-org-additional
 *
 * Fase 5 del refactor multi-organización: une a la cuenta autenticada a una
 * SEGUNDA (o enésima) organización, SIN migrar ni transferir ninguna tabla
 * operativa y SIN tocar su organización actual — a diferencia de
 * `/api/auth/join-org` (que sigue existiendo intacto, para su caso de uso
 * propio: piloto independiente que se fusiona a una empresa, con
 * transferencia de datos). Aquí solo se agrega una fila en
 * organization_members; la cuenta sigue viendo su organización activa
 * actual hasta que use el switcher (`POST /api/org/switch-active`) para
 * cambiar explícitamente — decisión confirmada con el usuario, sin
 * auto-cambio.
 *
 * Body: { nit: string, role: 'piloto' | 'jefe_pilotos' | 'gerente_sms' }
 */
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { JOINABLE_ROLES } from '@/app/api/auth/validate-join/route';
import { PLAN_CONFIG } from '@/lib/planLimits';

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
        const { data: pilotos } = await admin
          .from('organization_members')
          .select('id')
          .eq('organization_id', targetOrg.id)
          .eq('role', 'piloto');

        if ((pilotos?.length || 0) >= planConfig.maxPilots) {
          return NextResponse.json({
            error: `La organización alcanzó el límite de pilotos del plan. El gerente debe actualizar el plan.`,
          }, { status: 409 });
        }
      }
    }

    // ── Agregar la membresía — sin transferir datos ni tocar la org actual ────
    const { error: insertError } = await admin
      .from('organization_members')
      .insert({ user_id: user.id, organization_id: targetOrg.id, role, subscription_plan: 'piloto' });
    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      orgId: targetOrg.id,
      orgName: targetOrg.company_name,
      message: `Te uniste a ${targetOrg.company_name}. Puedes cambiar a esa organización desde tu cuenta cuando quieras.`,
    });

  } catch (err) {
    console.error('[join-org-additional]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
