import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// DELETE /api/logbook/:id — solo jefe_pilotos / superadmin
export async function DELETE(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { orgId, role } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!PERMISSIONS.canDeleteLogbook.includes(role)) {
      return NextResponse.json({ error: 'Solo el Jefe de Pilotos puede eliminar registros de bitácora.' }, { status: 403 });
    }

    const { id } = await params;

    // Verificar que el vuelo pertenece a la organización
    const { data: flight } = await supabase
      .from('flights')
      .select('id, replay_path')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (!flight) return NextResponse.json({ error: 'Vuelo no encontrado.' }, { status: 404 });

    // Eliminar replay de Storage si existe
    if (flight.replay_path) {
      await supabase.storage.from('flight-replays').remove([flight.replay_path]);
    }

    const { error } = await supabase
      .from('flights')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[logbook DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/logbook/:id  { pilot_id }
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { orgId, role } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!PERMISSIONS.canEditPilotPic.includes(role)) {
      return NextResponse.json({ error: 'Sin permiso para editar pilotos de vuelo.' }, { status: 403 });
    }

    const { id } = await params;
    const { pilot_id } = await request.json();

    // pilot_id puede ser null (desasignar) o un UUID
    if (pilot_id !== null && typeof pilot_id !== 'string') {
      return NextResponse.json({ error: 'pilot_id inválido.' }, { status: 400 });
    }

    // Verificar que el vuelo pertenece a la organización
    const { data: flight, error: fetchErr } = await supabase
      .from('flights')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!flight) return NextResponse.json({ error: 'Vuelo no encontrado.' }, { status: 404 });

    // Verificar que el pilot_id pertenece a la misma organización (si no es null)
    if (pilot_id) {
      const { data: pilot } = await supabase
        .from('pilots')
        .select('id')
        .eq('id', pilot_id)
        .eq('organization_id', orgId)
        .maybeSingle();

      if (!pilot) return NextResponse.json({ error: 'Piloto no encontrado en tu organización.' }, { status: 404 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('flights')
      .update({ pilot_id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, pilot_id, pilots:pilot_id(id, name)')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, flight: updated });
  } catch (err) {
    console.error('[logbook PATCH]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
