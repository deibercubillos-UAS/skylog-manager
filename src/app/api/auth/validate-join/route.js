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
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

// Roles únicos (máx 1 por org)
const UNIQUE_ROLES    = ['admin', 'jefe_pilotos', 'gerente_sms'];
// Roles que se pueden asignar al unirse
export const JOINABLE_ROLES = ['piloto', 'jefe_pilotos', 'gerente_sms'];

export async function GET(request) {
  try {
    // Endpoint público sin auth: acota la enumeración de organizaciones por NIT
    // (revela nombre + plan de una org si el NIT acierta). 30/min por IP.
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`validate-join:${ip}`, { limit: 30, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ valid: false, error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
    }

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

    // Buscar org por NIT: primero por tax_id (el NIT que conoce el usuario),
    // luego por unique_code (código interno) como respaldo retrocompatible.
    const SELECT = 'id, company_name, unique_code';
    let { data: org } = await supabase
      .from('organizations')
      .select(SELECT)
      .eq('tax_id', nit)
      .maybeSingle();

    if (!org) {
      ({ data: org } = await supabase
        .from('organizations')
        .select(SELECT)
        .eq('unique_code', nit)
        .maybeSingle());
    }

    if (!org) {
      return NextResponse.json({
        valid: false,
        error: 'No se encontró ninguna organización con ese NIT. Verifica con tu gerente.',
      });
    }

    // Plan de la org (lo tiene la membresía admin) — vía organization_members,
    // la fuente de verdad real de rol/plan por organización (no profiles, que
    // solo refleja la organización ACTIVA de cada cuenta).
    const { data: adminProf } = await supabase
      .from('organization_members')
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
        .from('organization_members')
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
          .from('organization_members')
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
