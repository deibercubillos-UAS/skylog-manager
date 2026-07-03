// FILE: src/app/api/subscription/route.js
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
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
    const admin = createAdminClient();

    // Primer día del mes actual (hora Colombia no importa aquí, comparación por fecha)
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    // Contar recursos de la org (con filtro de organization_id).
    // Regla de conteo: admin client + .select('id') + .length — NO count:'exact'/head:true
    // (PostgREST puede ignorar filtros RLS con head:true).
    const [profileRes, dronesRes, pilotsRes, flightsRes] = await Promise.all([
      supabase.from('profiles').select('subscription_expires_at').eq('id', user.id).single(),
      admin.from('aircraft').select('id').eq('organization_id', orgId),
      admin.from('pilots').select('pilot_role').eq('organization_id', orgId).eq('is_active', true),
      admin.from('flights').select('id').eq('organization_id', orgId).gte('flight_date', monthStartStr),
    ]);

    // Gerente General y Gerente SMS no cuentan contra el límite de tripulantes
    const pilotsCount = (pilotsRes.data || []).filter(p => crewCountsForLimit(p.pilot_role)).length;

    return NextResponse.json({
      planName:  currentPlan.name,
      planSlug:  planKey,
      expiresAt: profileRes.data?.subscription_expires_at || null,
      usage: {
        drones:      { current: (dronesRes.data || []).length, limit: currentPlan.maxDrones },
        pilots:      { current: pilotsCount, limit: currentPlan.maxPilots },
        flightsMonth:{ current: (flightsRes.data || []).length, limit: null },
      },
      features: currentPlan.features,
    });
  } catch (err) {
    console.error("API Subscription Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
