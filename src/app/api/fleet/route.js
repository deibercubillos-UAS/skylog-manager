import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { canAddResource } from '@/lib/planLimits';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('aircraft')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { aircraftData, currentPlan } = body;

    // Contar solo aeronaves de esta organización (no todas las de la DB)
    const { count } = await supabase
      .from('aircraft')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (!canAddResource(currentPlan, count || 0, 'drone')) {
      return NextResponse.json(
        { error: `Tu plan ${(currentPlan || '').toUpperCase()} ha llegado al límite de aeronaves.` },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('aircraft')
      .insert([{ ...aircraftData, organization_id: orgId, status: 'Operativo' }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
