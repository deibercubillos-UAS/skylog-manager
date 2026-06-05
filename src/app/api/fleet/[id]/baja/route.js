import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/fleet/:id/baja
 * Da de baja una aeronave: cambia status a 'Baja', guarda fecha y motivo.
 * Los registros de bitácora y mantenimiento NO se modifican.
 * Solo admin / superadmin pueden ejecutar esta acción.
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { orgId, role } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!PERMISSIONS.canManageAircraftStatus.includes(role)) {
      return NextResponse.json({ error: 'Solo el administrador puede dar de baja aeronaves.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    // Verificar que la aeronave pertenece a la organización
    const { data: aircraft } = await supabase
      .from('aircraft')
      .select('id, status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!aircraft) return NextResponse.json({ error: 'Aeronave no encontrada.' }, { status: 404 });
    if (aircraft.status === 'Baja') return NextResponse.json({ error: 'La aeronave ya está dada de baja.' }, { status: 409 });
    if (aircraft.status === 'Transferido') return NextResponse.json({ error: 'La aeronave fue transferida y no puede darse de baja.' }, { status: 409 });

    const { data, error } = await supabase
      .from('aircraft')
      .update({
        status: 'Baja',
        baja_date: new Date().toISOString().split('T')[0],
        baja_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, aircraft: data });
  } catch (err) {
    console.error('[fleet/baja]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
