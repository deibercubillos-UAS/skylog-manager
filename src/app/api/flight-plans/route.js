import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// GET /api/flight-plans — lista los planes activos de la organización
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    const { data, error } = await supabase
      .from('flight_plans')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[flight-plans GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/flight-plans — crea un plan de vuelo
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    // Mismo permiso que para gestionar operaciones (incluye piloto independiente)
    if (!hasPermission(role, 'canManageOps')) {
      return NextResponse.json({ error: 'Sin permiso para crear planes de vuelo.' }, { status: 403 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre de la operación es obligatorio.' }, { status: 400 });
    }

    // Allowlist explícita de campos (no mass-assignment)
    const record = {
      organization_id: orgId,
      owner_id:        user.id,
      name:            body.name.trim().slice(0, 200),
      geo_type:        body.geo_type || null,
      points:          Array.isArray(body.points) ? body.points : [],
      radius:          body.radius != null ? Number(body.radius) : null,
      altitude:        body.altitude != null ? parseInt(body.altitude) : null,
      flight_date:     body.flight_date || null,
      takeoff_time:    body.takeoff_time || null,
      location:        body.location ? String(body.location).slice(0, 300) : null,
      notes:           body.notes ? String(body.notes).slice(0, 2000) : null,
    };

    const { data, error } = await supabase
      .from('flight_plans')
      .insert([record])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[flight-plans POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/flight-plans?id=XXX — archiva (soft delete) un plan
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id.' }, { status: 400 });

    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });

    const { error } = await supabase
      .from('flight_plans')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[flight-plans DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
