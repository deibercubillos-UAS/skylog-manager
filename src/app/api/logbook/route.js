import { validateRole } from '@/lib/rbac';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Validamos que el usuario pertenezca a la organización
    const { profile } = await validateRole(['admin', 'gerente_sms', 'jefe_pilotos', 'piloto']);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('flights')
      .select('*, pilots(name), aircraft(model)')
      .eq('organization_id', profile.organization_id) // Filtro estricto por empresa
      .order('flight_date', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}