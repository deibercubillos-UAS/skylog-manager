import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
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
    // Usamos admin client con filtro explícito de orgId para evitar
    // cualquier interferencia de RLS o sesión en el conteo. Ya bypassa RLS por
    // ser service role, así que count:'exact'/head:true es seguro y correcto.
    const supabaseAdmin = createAdminClient();
    const { count: existingBatteriesCount } = await supabaseAdmin
      .from('batteries')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    const currentBatteryCount = existingBatteriesCount ?? 0;

    if (!canAddResource(subscription_plan, currentBatteryCount, 'battery')) {
      return NextResponse.json(
        { error: `Tu plan ha llegado al límite de baterías (${currentBatteryCount}/3 registradas).` },
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
        last_maintenance: body.last_maintenance || null,
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
