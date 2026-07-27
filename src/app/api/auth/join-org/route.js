/**
 * POST /api/auth/join-org
 *
 * Permite a un piloto independiente (plan=piloto, rol=admin, org propia)
 * unirse a una organización existente. Transfiere toda su data al nuevo org.
 *
 * Body: { nit: string, role: 'piloto' | 'jefe_pilotos' | 'gerente_sms' }
 *
 * Operaciones (todas via service_role para bypass RLS):
 *   1. Valida usuario y que sea piloto independiente
 *   2. Busca org destino por NIT
 *   3. Verifica disponibilidad del rol
 *   4. Transfiere: aircraft, batteries, flights, pilots, flight_plans, flight_authorizations, sms_reports
 *   5. Actualiza perfil (organization_id + role)
 *   6. Marca la org origen como merged (no se elimina, conserva el nombre)
 */
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
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

    // ── Autenticar usuario ────────────────────────────────────────────────────
    const supabase = await createClientSSR();
    const { user, orgId: currentOrgId, role: currentRole, plan } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (!currentOrgId) return NextResponse.json({ error: 'Sin organización.' }, { status: 403 });

    // Solo puede usar esta función un piloto independiente (plan piloto + admin)
    if (plan !== 'piloto' || currentRole !== 'admin') {
      return NextResponse.json({
        error: 'Esta opción solo está disponible para pilotos independientes con plan gratuito.',
      }, { status: 403 });
    }

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

    if (targetOrg.id === currentOrgId) {
      return NextResponse.json({ error: 'Ya perteneces a esa organización.' }, { status: 400 });
    }

    // ── Verificar disponibilidad del rol ──────────────────────────────────────
    const UNIQUE_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms'];

    if (UNIQUE_ROLES.includes(role)) {
      const { data: existing } = await admin
        .from('profiles')
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
      const { data: adminProf } = await admin
        .from('profiles')
        .select('subscription_plan')
        .eq('organization_id', targetOrg.id)
        .eq('role', 'admin')
        .maybeSingle();

      const planKey = adminProf?.subscription_plan || 'piloto';
      const planConfig = PLAN_CONFIG[planKey] || PLAN_CONFIG.piloto;

      if (planConfig.maxPilots !== null && planConfig.maxPilots !== undefined) {
        // Admin client (service role) ya bypassa RLS por diseño — count:'exact'/head:true
        // es seguro y correcto aquí (a diferencia de la Regla de conteo del proyecto, que
        // aplica al cliente REGULAR, donde PostgREST puede ignorar filtros RLS bajo head:true).
        const { count: pilotosCount } = await admin
          .from('profiles')
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

    // ── Transferir data al nuevo org ──────────────────────────────────────────
    // Orden: primero tablas hijo, después perfil

    const tables = [
      'aircraft',
      'batteries',
      'flights',
      'pilots',
      'flight_plans',
      'flight_authorizations',
      'sms_reports',
      'maintenance_logs',
      'checklist_templates',
      'sora_templates',
    ];

    for (const table of tables) {
      // No todas las tablas tienen organization_id — usar maybeSingle-safe update
      const { error } = await admin
        .from(table)
        .update({ organization_id: targetOrg.id })
        .eq('organization_id', currentOrgId);

      // Ignorar errores en tablas que podrían no tener la columna o estar vacías
      if (error && !error.message.includes('does not exist') && !error.message.includes('column')) {
        console.warn(`[join-org] warn transferring ${table}:`, error.message);
      }
    }

    // ── Actualizar perfil del usuario ─────────────────────────────────────────
    // active_organization_id también se actualiza: la org origen queda
    // marcada "[Migrada]" más abajo, así que dejar la org activa apuntando
    // ahí rompería private.user_org_id() (y por tanto toda política RLS)
    // para este usuario hasta que usara el switcher manualmente.
    const { error: profileError } = await admin
      .from('profiles')
      .update({ organization_id: targetOrg.id, active_organization_id: targetOrg.id, role })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // ── Marcar org origen como migrada (no eliminar, conservar historial) ─────
    await admin
      .from('organizations')
      .update({ company_name: `[Migrada] ${targetOrg.company_name}` })
      .eq('id', currentOrgId);

    return NextResponse.json({
      success: true,
      orgName: targetOrg.company_name,
      message: `Te uniste a ${targetOrg.company_name}. Tu bitácora y flota han sido transferidas.`,
    });

  } catch (err) {
    console.error('[join-org]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
