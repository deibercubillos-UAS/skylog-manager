// FILE: src/app/api/subscription/route.js
import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PLAN_CONFIG, crewCountsForLimit } from '@/lib/planLimits';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabase = await createClientSSR();

    // getUser() valida el token contra Supabase (anti-spoofing)
    const { user, orgId, subscription_plan: planKey } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const currentPlan = PLAN_CONFIG[planKey] || PLAN_CONFIG['piloto'];

    // Contar recursos de la org (con filtro de organization_id)
    // Pilotos: traer pilot_role para excluir gerentes del conteo del límite.
    const [profileRes, dronesRes, pilotsRes] = await Promise.all([
      supabase.from('profiles').select('subscription_expires_at').eq('id', user.id).single(),
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('pilots').select('pilot_role').eq('organization_id', orgId).eq('is_active', true),
    ]);

    // Gerente General y Gerente SMS no cuentan contra el límite de tripulantes
    const pilotsCount = (pilotsRes.data || []).filter(p => crewCountsForLimit(p.pilot_role)).length;

    return NextResponse.json({
      planName:  currentPlan.name,
      planSlug:  planKey,
      expiresAt: profileRes.data?.subscription_expires_at || null,
      usage: {
        drones: { current: dronesRes.count || 0, limit: currentPlan.maxDrones },
        pilots: { current: pilotsCount, limit: currentPlan.maxPilots },
      },
      features: currentPlan.features,
    });
  } catch (err) {
    console.error("API Subscription Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
