/**
 * GET /api/auth/validate-join?nit=XXX&role=XXX
 *
 * Valida que una organización exista por NIT y que el rol solicitado
 * esté disponible antes de crear la cuenta.
 *
 * Respuesta:
 *   { valid: true, orgId, orgName, plan, roleAvailable: true, slotsLeft? }
 *   { valid: true, orgId, orgName, plan, roleAvailable: false, reason }
 *   { valid: false, error }
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PLAN_CONFIG } from '@/lib/planLimits';

// Roles únicos (máx 1 por org)
const UNIQUE_ROLES    = ['admin', 'jefe_pilotos', 'gerente_sms'];
// Roles que se pueden asignar al unirse
export const JOINABLE_ROLES = ['piloto', 'jefe_pilotos', 'gerente_sms'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawNit = searchParams.get('nit') || '';
    const role   = searchParams.get('role') || '';

    const nit = rawNit.replace(/[\s\-.]/g, '').toUpperCase();
    if (!nit) return NextResponse.json({ valid: false, error: 'NIT requerido' });

    if (role && !JOINABLE_ROLES.includes(role)) {
      return NextResponse.json({ valid: false, error: 'Rol no permitido para unirse' });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // Buscar org por unique_code (= NIT normalizado)
    const { data: org } = await supabase
      .from('organizations')
      .select('id, company_name, unique_code')
      .eq('unique_code', nit)
      .maybeSingle();

    if (!org) {
      return NextResponse.json({
        valid: false,
        error: 'No se encontró ninguna organización con ese NIT. Verifica con tu gerente.',
      });
    }

    // Plan de la org (lo tiene el perfil admin)
    const { data: adminProf } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('organization_id', org.id)
      .eq('role', 'admin')
      .maybeSingle();

    const planKey    = adminProf?.subscription_plan || 'piloto';
    const planConfig = PLAN_CONFIG[planKey] || PLAN_CONFIG.piloto;

    const base = {
      valid:   true,
      orgId:   org.id,
      orgName: org.company_name,
      orgCode: org.unique_code,
      plan:    planKey,
    };

    // Sin rol → solo validar que la org exista
    if (!role) return NextResponse.json(base);

    // ── Verificar disponibilidad del rol ─────────────────────────────────────

    if (UNIQUE_ROLES.includes(role)) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('role', role);

      if ((count ?? 0) > 0) {
        const labels = { jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS', admin: 'Gerente General' };
        return NextResponse.json({
          ...base,
          roleAvailable: false,
          reason: `El rol "${labels[role] || role}" ya está ocupado en esta organización.`,
        });
      }
    }

    if (role === 'piloto') {
      const maxPilots = planConfig.maxPilots;
      if (maxPilots !== null && maxPilots !== undefined) {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .eq('role', 'piloto');

        const currentCount = count ?? 0;
        if (currentCount >= maxPilots) {
          return NextResponse.json({
            ...base,
            roleAvailable: false,
            reason: `La organización alcanzó el límite de pilotos (${maxPilots}) del plan ${planConfig.name}. El gerente debe actualizar el plan.`,
          });
        }
        base.slotsLeft = maxPilots - currentCount;
      }
    }

    return NextResponse.json({ ...base, roleAvailable: true });

  } catch (err) {
    console.error('[validate-join]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
