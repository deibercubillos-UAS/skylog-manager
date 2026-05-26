import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const supabase = await createClientSSR();

    // Obtener userId del token — no del query string
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Obtenemos las plantillas de mitigación del usuario autenticado
    const { data, error } = await supabase
      .from('sora_templates')
      .select('*')
      .eq('owner_id', user.id)
      .order('category', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
