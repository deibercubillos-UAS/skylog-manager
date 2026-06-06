import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { canAddResource } from '@/lib/planLimits';
import { hasPermission } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * POST /api/fleet/tech
 *
 * Crea un equipo de tecnología/payload (inventory_items) con verificación de:
 *   1. Autenticación y pertenencia a org
 *   2. Permiso de rol: canManageFleet (admin, jefe_pilotos, superadmin, piloto)
 *   3. Límite del plan (piloto: máx 3, resto: ilimitados)
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
        { error: 'No tienes permisos para registrar equipos. Contacta a tu administrador.' },
        { status: 403 }
      );
    }

    // ── Validar campos ────────────────────────────────────────────
    if (!body.serial_number?.trim()) {
      return NextResponse.json({ error: 'El serial es obligatorio.' }, { status: 400 });
    }

    // ── Verificar límite del plan ─────────────────────────────────
    // Admin client con filtro explícito de orgId para conteo confiable.
    const supabaseAdmin = createAdminClient();
    const { data: existingTech } = await supabaseAdmin
      .from('inventory_items')
      .select('id')
      .eq('organization_id', orgId);

    const currentTechCount = existingTech?.length ?? 0;

    if (!canAddResource(subscription_plan, currentTechCount, 'tech')) {
      return NextResponse.json(
        { error: `Tu plan ha llegado al límite de equipos de tecnología (${currentTechCount}/3 registrados).` },
        { status: 402 }
      );
    }

    // ── Crear equipo ──────────────────────────────────────────────
    const brand = body.brand?.trim() || '';
    const model = body.model?.trim() || '';

    const { data, error } = await supabase
      .from('inventory_items')
      .insert([{
        owner_id:        user.id,
        organization_id: orgId,
        category:        body.category?.trim() || '',
        brand,
        model,
        serial_number:   body.serial_number.trim().toUpperCase(),
        name:            `${brand} ${model}`.trim(),
        status:          'Operativo',
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `Ya existe un equipo con el serial "${body.serial_number}" en tu organización.` },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[fleet/tech POST]', err);
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 });
  }
}
