import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// OBTENER PROTOCOLOS
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: soraItems, error } = await supabase
      .from('form_definitions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('form_type', 'sora')
      .order('field_number', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      checklist: [],
      sora: (soraItems || []).map(r => ({
        id: r.id,
        category: r.aircraft_model || 'General',
        label: r.label_text,
        field_number: r.field_number,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// CREAR NUEVO ITEM
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();

    // Acción especial: sembrar OSOs JARUS por defecto
    if (body.action === 'seed_sora') {
      const rows = body.items.map((item, idx) => ({
        organization_id: orgId,
        form_type: 'sora',
        aircraft_model: item.category || 'General',
        field_number: idx + 1,
        label_text: item.label,
      }));

      const { error } = await supabase.from('form_definitions').insert(rows);
      if (error) throw error;
      return NextResponse.json({ message: 'OSOs sembrados correctamente' }, { status: 201 });
    }

    // Creación individual de item SORA
    const { type, data } = body;
    if (!type || !data) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    if (type !== 'sora') {
      return NextResponse.json({ error: 'Tipo no soportado' }, { status: 400 });
    }

    // Calcular siguiente field_number para el org
    const { data: existing } = await supabase
      .from('form_definitions')
      .select('field_number')
      .eq('organization_id', orgId)
      .eq('form_type', 'sora')
      .order('field_number', { ascending: false })
      .limit(1);

    const nextNum = ((existing?.[0]?.field_number) ?? 0) + 1;

    const { data: result, error } = await supabase
      .from('form_definitions')
      .insert([{
        organization_id: orgId,
        form_type: 'sora',
        aircraft_model: data.category || 'General',
        field_number: nextNum,
        label_text: data.label,
      }])
      .select();

    if (error) throw error;
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
