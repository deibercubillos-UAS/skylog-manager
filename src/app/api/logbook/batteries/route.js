import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    // Validar que aircraft_id y flight_id pertenecen a la org del usuario (evita IDOR cross-tenant)
    if (body.aircraft_id) {
      const { data: ac } = await supabase
        .from('aircraft').select('id').eq('id', body.aircraft_id).eq('organization_id', orgId).maybeSingle();
      if (!ac) return NextResponse.json({ error: 'Aeronave no encontrada en tu organización' }, { status: 404 });
    }
    if (body.flight_id) {
      const { data: fl } = await supabase
        .from('flights').select('id').eq('id', body.flight_id).eq('organization_id', orgId).maybeSingle();
      if (!fl) return NextResponse.json({ error: 'Vuelo no encontrado en tu organización' }, { status: 404 });
    }

    const { data, error } = await supabase.from('battery_logs').insert([{
      owner_id:          user.id,
      organization_id:   orgId,
      aircraft_id:       body.aircraft_id,
      flight_id:         body.flight_id,
      battery_model:     body.battery_model,
      battery_sn:        body.battery_sn,
      charge_percentage: body.charge_percentage,
      cycle_number:      body.cycle_number,
      notes:             body.notes,
    }]).select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
