import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { canAddResource } from '@/lib/planLimits';
import { hasPermission } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * POST /api/fleet/batteries
 *
 * Crea una batería en la org del usuario con verificación de:
 *   1. Autenticación y pertenencia a org
 *   2. Permiso de rol: canManageFleet (admin, jefe_pilotos, superadmin, piloto)
 *   3. Límite del plan (piloto: máx 3, resto: ilimitadas)
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const supabase = await createClientSSR();
    const { user, orgId, role, subscription_plan } = await getOrgContext(supabase);

    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    // ── Verificar rol ────────────────────────────────────────────
    if (!hasPermission(role, 'canManageFleet')) {
      return NextResponse.json(
        { error: 'No tienes permisos para registrar baterías. Contacta a tu administrador.' },
        { status: 403 }
      );
    }

    // ── Validar campos ────────────────────────────────────────────
    if (!body.serial_number?.trim()) {
      return NextResponse.json({ error: 'El serial es obligatorio.' }, { status: 400 });
    }

    // ── Verificar límite del plan ─────────────────────────────────
    const { count } = await supabase
      .from('batteries')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (!canAddResource(subscription_plan, count || 0, 'battery')) {
      return NextResponse.json(
        { error: `Tu plan ha llegado al límite de baterías (máx ${subscription_plan === 'piloto' ? 3 : '∞'}).` },
        { status: 402 }
      );
    }

    // ── Crear batería ─────────────────────────────────────────────
    const { data, error } = await supabase
      .from('batteries')
      .insert([{
        owner_id:        user.id,
        organization_id: orgId,
        brand:           body.brand?.trim()         || 'DJI',
        model:           body.model?.trim()         || '',
        serial_number:   body.serial_number.trim().toUpperCase(),
        cycles:          Number(body.cycles)        || 0,
        health_status:   Number(body.health_status) || 100,
        status:          'Operativo',
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Ya existe una batería con el serial "${body.serial_number}" en tu organización.` },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[fleet/batteries POST]', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
