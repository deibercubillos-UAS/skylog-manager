import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    // Creación de ítem en catálogo
    if (body.action === 'add_item') {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{ owner_id: user.id, organization_id: orgId, name: body.name }])
        .select();
      if (error) throw error;
      return NextResponse.json(data[0]);
    }

    // Registro de inventario para una misión
    const { data, error } = await supabase
      .from('mission_inventory_logs')
      .insert([{
        owner_id:       user.id,
        organization_id: orgId,
        flight_id:      body.flight_id,
        items_json:     body.items,
        notes:          body.notes,
      }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
