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

    const [checklist, sora] = await Promise.all([
      supabase.from('checklist_templates').select('*').eq('owner_id', user.id).order('category'),
      supabase.from('sora_templates').select('*').eq('owner_id', user.id).order('category'),
    ]);

    return NextResponse.json({
      checklist: checklist.data || [],
      sora: sora.data || [],
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
    const { type, data } = body; // type: 'checklist' o 'sora'

    if (!type || !data) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const table = type === 'checklist' ? 'checklist_templates' : 'sora_templates';

    const { data: result, error } = await supabase
      .from(table)
      .insert([{ ...data, owner_id: user.id, organization_id: orgId }])
      .select();

    if (error) throw error;
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
