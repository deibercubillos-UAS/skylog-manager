import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Ventana de solape considerada un conflicto (en horas) alrededor de scheduled_at.
const WINDOW_HOURS = 2;

/**
 * GET /api/flights/conflicts?pilot_id=&scheduled_at=&exclude_id=
 *
 * Devuelve { conflict: bool, missions: [...] } si el piloto ya tiene una misión
 * no cancelada dentro de ±2h del horario propuesto. Acotado a la org. Read-only.
 */
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sp = new URL(request.url).searchParams;
    const pilotId = sp.get('pilot_id');
    const scheduledAt = sp.get('scheduled_at');
    const excludeId = sp.get('exclude_id');
    if (!pilotId || !scheduledAt) return NextResponse.json({ conflict: false, missions: [] });

    const t = new Date(scheduledAt).getTime();
    if (isNaN(t)) return NextResponse.json({ conflict: false, missions: [] });

    const from = new Date(t - WINDOW_HOURS * 3600 * 1000).toISOString();
    const to   = new Date(t + WINDOW_HOURS * 3600 * 1000).toISOString();

    let query = supabase
      .from('flight_authorizations')
      .select('id, mission_id, scheduled_at, location')
      .eq('organization_id', orgId)
      .eq('pilot_id', pilotId)
      .neq('status', 'cancelado')
      .neq('status', 'realizado')
      .gte('scheduled_at', from)
      .lte('scheduled_at', to);

    if (excludeId) query = query.neq('id', excludeId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ conflict: (data || []).length > 0, missions: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
