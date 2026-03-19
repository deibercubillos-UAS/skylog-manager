import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// OBTENER UN PILOTO ESPECÍFICO
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('pilots').select('*').eq('id', id).single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// EDITAR DATOS DEL PILOTO
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { updateData } = body;
    const authHeader = request.headers.get('Authorization');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

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
}

// DAR DE BAJA (SOFT DELETE) - RESERVADO PARA ADMIN, SMS Y JEFE PILOTOS
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validar Rol en el servidor antes de proceder
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    const rolesAutorizados = ['admin', 'gerente_sms', 'jefe_pilotos'];

    if (!rolesAutorizados.includes(profile.role)) {
      return NextResponse.json({ error: "No autorizado para dar de baja tripulantes" }, { status: 403 });
    }

    // Borrado Lógico: is_active = false
    const { error } = await supabase
      .from('pilots')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: "Tripulante dado de baja" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}