import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Campos que un usuario puede editar en su propio perfil.
// NUNCA incluir: role, subscription_plan, organization_id, wompi_subscription_ref, id
const EDITABLE_PROFILE_FIELDS = [
  'first_name', 'last_name', 'full_name',
  'phone', 'city', 'address',
  'license_number', 'medical_expiry', 'avatar_url',
  'emergency_contact_name', 'emergency_contact_phone',
];

export async function GET(request) {
  try {
    const supabase = await createClient();

    // getUser() valida el token contra Supabase (anti-spoofing)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Siempre el perfil del usuario autenticado — ignorar cualquier query param
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { updateData } = body;

    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: "updateData requerido" }, { status: 400 });
    }

    // Filtrar: solo campos editables por el propio usuario
    const safeUpdate = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => EDITABLE_PROFILE_FIELDS.includes(key))
    );

    if (Object.keys(safeUpdate).length === 0) {
      return NextResponse.json({ error: "No hay campos editables válidos" }, { status: 400 });
    }

    // Actualizar siempre el perfil del usuario autenticado — sin IDOR posible
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...safeUpdate, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
