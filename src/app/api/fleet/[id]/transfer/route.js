import { createClientSSR } from '@/lib/supabaseServer';
import { createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/fleet/:id/transfer
 * Transfiere una aeronave a otra organización junto con sus vuelos y mantenimiento.
 * Body: { target_org_email: string }  — email del admin de la org destino
 *
 * El piloto actual queda sin asignar en los vuelos transferidos (puede no existir en destino).
 * Solo admin / superadmin pueden transferir.
 */
export async function POST(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { orgId, role } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!PERMISSIONS.canManageAircraftStatus.includes(role)) {
      return NextResponse.json({ error: 'Solo el administrador puede transferir aeronaves.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const targetEmail = typeof body.target_org_email === 'string' ? body.target_org_email.trim().toLowerCase() : '';

    if (!targetEmail) {
      return NextResponse.json({ error: 'El email del administrador destino es requerido.' }, { status: 400 });
    }

    // Verificar que la aeronave pertenece a la organización y no está ya transferida
    const { data: aircraft } = await supabase
      .from('aircraft')
      .select('id, model, serial_number, status')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!aircraft) return NextResponse.json({ error: 'Aeronave no encontrada.' }, { status: 404 });
    if (aircraft.status === 'Transferido') return NextResponse.json({ error: 'La aeronave ya fue transferida.' }, { status: 409 });

    // Buscar la organización destino por el email de su admin
    const supabaseAdmin = createAdminClient();
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id, role')
      .eq('email', targetEmail)
      .in('role', ['admin', 'superadmin'])
      .maybeSingle();

    if (!targetProfile?.organization_id) {
      return NextResponse.json({ error: 'No se encontró una organización con ese administrador.' }, { status: 404 });
    }

    const targetOrgId = targetProfile.organization_id;

    if (targetOrgId === orgId) {
      return NextResponse.json({ error: 'La organización destino es la misma que la actual.' }, { status: 400 });
    }

    // Obtener nombre de la org destino para el mensaje
    const { data: targetOrg } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', targetOrgId)
      .maybeSingle();

    // 1. Transferir la aeronave
    //    - organization_id pasa a la org destino (el receptor ve el drone + total_hours)
    //    - Los vuelos (bitácora) NO se mueven: quedan como registro histórico en la org origen
    const { error: aircraftErr } = await supabaseAdmin
      .from('aircraft')
      .update({
        organization_id: targetOrgId,
        status: 'Operativo',
        transferred_to_org_id: targetOrgId,
        transferred_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (aircraftErr) throw aircraftErr;

    // 2. Transferir registros de mantenimiento (historial técnico viaja con la aeronave)
    const { error: maintErr } = await supabaseAdmin
      .from('maintenance_logs')
      .update({ organization_id: targetOrgId })
      .eq('aircraft_id', id)
      .eq('organization_id', orgId);

    // mantenimiento es no-crítico: si falla no revierte la transferencia
    if (maintErr) console.warn('[fleet/transfer] Error transfiriendo maintenance_logs:', maintErr.message);

    // NOTA: Los registros de vuelo (flights) quedan en la org origen como
    //       registro histórico de la bitácora. El receptor recibe la aeronave
    //       con sus horas totales (total_hours) y su historial de mantenimiento,
    //       pero los registros de misiones específicas permanecen privados.

    return NextResponse.json({
      success: true,
      message: `Aeronave transferida a ${targetOrg?.name || 'la organización destino'} correctamente. Las horas de vuelo (${aircraft.model}) y el historial de mantenimiento fueron transferidos. Los registros de bitácora quedan en tu historial privado.`,
    });
  } catch (err) {
    console.error('[fleet/transfer]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
