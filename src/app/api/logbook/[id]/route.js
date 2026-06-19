import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { PERMISSIONS } from '@/lib/roles';
import { storageRemove } from '@/lib/storage';

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
      await storageRemove({ bucket: 'flight-replays', keys: flight.replay_path });
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

// PATCH /api/logbook/:id  { pilot_id?, mission_id? }
export async function PATCH(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { orgId, role } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!PERMISSIONS.canEditPilotPic.includes(role)) {
      return NextResponse.json({ error: 'Sin permiso para editar este vuelo.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Campos permitidos: pilot_id y/o mission_id
    const patch = {};

    if ('pilot_id' in body) {
      const { pilot_id } = body;
      if (pilot_id !== null && typeof pilot_id !== 'string') {
        return NextResponse.json({ error: 'pilot_id inválido.' }, { status: 400 });
      }
      if (pilot_id) {
        const { data: pilot } = await supabase
          .from('pilots')
          .select('id')
          .eq('id', pilot_id)
          .eq('organization_id', orgId)
          .maybeSingle();
        if (!pilot) return NextResponse.json({ error: 'Piloto no encontrado en tu organización.' }, { status: 404 });
      }
      patch.pilot_id = pilot_id;
    }

    if ('mission_id' in body) {
      const val = body.mission_id;
      patch.mission_id = val ? String(val).trim().slice(0, 100) : null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 });
    }

    // Verificar que el vuelo pertenece a la org
    const { data: flight, error: fetchErr } = await supabase
      .from('flights')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!flight) return NextResponse.json({ error: 'Vuelo no encontrado.' }, { status: 404 });

    const { data: updated, error: updateErr } = await supabase
      .from('flights')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select('id, pilot_id, mission_id, pilots:pilot_id(id, name)')
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, flight: updated });
  } catch (err) {
    console.error('[logbook PATCH]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
