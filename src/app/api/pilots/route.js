import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/pilots — Lista pilotos de la organización
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/pilots — Crea un nuevo piloto
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { pilotData } = body;

    if (!pilotData?.name) {
      return NextResponse.json({ error: 'El nombre del piloto es obligatorio' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pilots')
      .insert([{ ...pilotData, owner_id: user.id, organization_id: orgId, is_active: true }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
