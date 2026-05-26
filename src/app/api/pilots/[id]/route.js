import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Campos editables de un piloto.
// Bloqueados: organization_id, owner_id, id, created_at, is_active (soft-delete es por DELETE).
const ALLOWED_PILOT_FIELDS = [
  'name', 'email', 'phone', 'license_number', 'medical_expiry',
  'pilot_role', 'position', 'notes', 'avatar_url',
  'aerocivil_theoretical', 'aerocivil_practical',
  'theoretical_approval_date', 'practical_approval_date',
  'address', 'city', 'emergency_contact_name', 'emergency_contact_phone',
];

// OBTENER UN PILOTO ESPECÍFICO (requiere autenticación y org match)
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Piloto no encontrado' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// EDITAR DATOS DEL PILOTO
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

    // Allowlist: evitar mass-assignment de campos sensibles
    const safeUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => ALLOWED_PILOT_FIELDS.includes(key))
    );

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pilots')
      .update({ ...safeUpdate, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select();

    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Piloto no encontrado en tu organización' }, { status: 404 });
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DAR DE BAJA (SOFT DELETE) — solo admin / jefe_pilotos / superadmin
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Verificar rol en servidor (ya no se confía en userId del cliente)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const rolesAutorizados = ['superadmin', 'admin', 'jefe_pilotos'];
    if (!rolesAutorizados.includes(profile?.role)) {
      return NextResponse.json({ error: 'Sin permisos para dar de baja tripulantes' }, { status: 403 });
    }

    // Borrado lógico verificando org
    const { error } = await supabase
      .from('pilots')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;
    return NextResponse.json({ message: 'Tripulante dado de baja' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
