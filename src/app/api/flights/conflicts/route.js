import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/flights/conflicts?pilot_id=&scheduled_at=&exclude_id=
 *
 * Devuelve { conflict: bool, missions: [...] } si el piloto ya tiene una misión
 * no cancelada el MISMO DÍA calendario del horario propuesto. Acotado a la org.
 *
 * ⚠️ La granularidad es por día: `flight_authorizations.scheduled_at` guarda solo
 * la fecha (el form envía <input type="date">; la hora de despegue vive en
 * plan_data.takeoff_time). Una ventana horaria fina (±2h) nunca coincidiría con
 * los datos reales — todos los registros quedan a medianoche.
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

    // Día calendario propuesto (acepta 'YYYY-MM-DD' o ISO completo)
    const day = String(scheduledAt).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ conflict: false, missions: [] });

    let query = supabase
      .from('flight_authorizations')
      .select('id, mission_id, scheduled_at, location')
      .eq('organization_id', orgId)
      .eq('pilot_id', pilotId)
      .neq('status', 'cancelado')
      .neq('status', 'realizado')
      .gte('scheduled_at', `${day}T00:00:00`)
      .lte('scheduled_at', `${day}T23:59:59.999`);

    if (excludeId) query = query.neq('id', excludeId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ conflict: (data || []).length > 0, missions: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
