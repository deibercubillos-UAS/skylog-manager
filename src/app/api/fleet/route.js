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
      .select('id,model,manufacturer,serial_number,total_hours,last_maintenance_date,last_maintenance_hours,status,image_url,ruas,created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const res = NextResponse.json(data || []);
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    // subscription_plan viene del servidor (getOrgContext lo lee de la BD)
    const { orgId, subscription_plan } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { aircraftData } = body;   // currentPlan ignorado: el plan se lee del servidor

    // Contar solo aeronaves de esta organización (no todas las de la DB)
    const { count } = await supabase
      .from('aircraft')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if (!canAddResource(subscription_plan, count || 0, 'drone')) {
      return NextResponse.json(
        { error: `Tu plan ${subscription_plan.toUpperCase()} ha llegado al límite de aeronaves.` },
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
