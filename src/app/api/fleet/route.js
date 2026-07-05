import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { canAddResource } from '@/lib/planLimits';
import { logAudit } from '@/lib/auditLog';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('aircraft')
      .select('id,model,brand,serial_number,total_hours,last_maintenance_date,last_maintenance_hours,status,image_url,ruas,created_at')
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
    const { orgId, subscription_plan, fullName } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // owner_id es NOT NULL en la tabla aircraft — obtener el user actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { aircraftData } = body;   // currentPlan ignorado: el plan se lee del servidor

    // Contar solo aeronaves de esta organización (Regla de conteo del proyecto:
    // createAdminClient() + .select('id') + .length — NO count:'exact'/head:true,
    // que PostgREST puede evaluar ignorando filtros RLS y dar un conteo poco fiable).
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('aircraft')
      .select('id')
      .eq('organization_id', orgId);
    const count = existing?.length || 0;

    if (!canAddResource(subscription_plan, count, 'drone')) {
      return NextResponse.json(
        { error: `Tu plan ${subscription_plan.toUpperCase()} ha llegado al límite de aeronaves.` },
        { status: 403 }
      );
    }

    // Campos explícitos — nunca insertar el body completo (mass-assignment)
    const ALLOWED_FIELDS = [
      'brand', 'model', 'serial_number', 'ruas', 'mtow', 'image_url',
      'total_hours', 'last_maintenance_date', 'last_maintenance_hours',
      'maintenance_interval_hours', 'maintenance_interval_days',
      'next_maintenance_date', 'rce_url', 'dan_url', 'operational_status',
    ];
    const cleanData = {};
    for (const f of ALLOWED_FIELDS) {
      if (aircraftData[f] !== undefined) cleanData[f] = aircraftData[f];
    }
    // operational_status solo acepta los dos valores reales del CHECK de la tabla
    if (cleanData.operational_status && !['disponible', 'en_mantenimiento'].includes(cleanData.operational_status)) {
      delete cleanData.operational_status;
    }

    const { data, error } = await supabase
      .from('aircraft')
      .insert([{ ...cleanData, owner_id: user.id, organization_id: orgId, status: 'Operativo' }])
      .select();

    if (error) throw error;

    logAudit({
      orgId, actorId: user.id, actorName: fullName || user.email, action: 'create', module: 'fleet',
      entityLabel: `${data[0].model || 'Aeronave'} · ${data[0].serial_number || ''}`.trim(),
      metadata: { aircraft_id: data[0].id },
    });

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
