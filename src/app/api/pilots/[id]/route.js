import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const { userId, updateData } = body;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validar Rol en el servidor
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    if (profile.role !== 'admin' && profile.role !== 'gerente_sms') {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('pilots')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const authHeader = request.headers.get('Authorization');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. Validar Rol (Solo Admin, Gerente SMS o Jefe de Pilotos)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    const authorizedRoles = ['admin', 'gerente_sms', 'jefe_pilotos'];
    
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: "No tiene permisos para dar de baja tripulantes" }, { status: 403 });
    }

    // 2. BORRADO LÓGICO: Solo cambiamos el estado a Inactivo
    const { error } = await supabase
      .from('pilots')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: "Piloto dado de baja exitosamente" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}