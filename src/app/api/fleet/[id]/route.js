import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Campos que se pueden actualizar en una aeronave.
// Bloqueados: organization_id, owner_id, id, created_at.
const ALLOWED_AIRCRAFT_FIELDS = [
  'model', 'brand', 'serial_number', 'registration_number',
  'weight_grams', 'max_takeoff_weight', 'max_flight_time_min',
  'battery_type', 'drone_class', 'notes', 'status',
  'total_hours', 'last_maintenance_date', 'last_maintenance_hours',
  'image_url', 'purchase_date', 'insurance_expiry', 'remote_id',
  'color', 'firmware_version', 'category',
];

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { updateData } = body;

    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: 'updateData requerido' }, { status: 400 });
    }

    // Allowlist: bloquear campos que no deben actualizarse desde el cliente
    const safeUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => ALLOWED_AIRCRAFT_FIELDS.includes(key))
    );

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    // Solo actualiza si la aeronave pertenece a la organización del usuario
    const { data, error } = await supabase
      .from('aircraft')
      .update({ ...safeUpdate, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select();

    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Aeronave no encontrada en tu organización' }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
