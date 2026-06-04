// GET /api/org/replay-quota
// Devuelve la situación actual de uso de replays de la org.
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const ctx      = await getOrgContext(supabase);
    if (!ctx?.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!PERMISSIONS.canViewFlightReplay.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Leer configuración del plan
    const { data: cfg } = await admin
      .from('epayco_plan_config')
      .select('replay_retention_days, replay_max_flights')
      .eq('plan_key', ctx.subscription_plan ?? 'piloto')
      .eq('billing', 'monthly')
      .single();

    const retentionDays = cfg?.replay_retention_days ?? 30;
    const maxFlights    = cfg?.replay_max_flights    ?? 10;
    const isUnlimited   = maxFlights === 0;

    // Contar replays actuales de la org
    const { count } = await admin
      .from('flights')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.orgId)
      .not('replay_path', 'is', null);

    return NextResponse.json({
      plan:          ctx.subscription_plan ?? 'piloto',
      replayCount:   count ?? 0,
      maxFlights,
      retentionDays,
      isUnlimited,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
