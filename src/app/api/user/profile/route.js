import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 1. OBTENER PERFIL
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. ACTUALIZAR PERFIL (NUEVO MÉTODO)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId, updateData } = body;
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validar que el usuario no intente promoverse a Admin si no lo es
    // (Seguridad de lado del servidor)
    if (updateData.role === 'admin') {
       const { data: current } = await supabase.from('profiles').select('role').eq('id', userId).single();
       if (current.role !== 'admin') {
         return NextResponse.json({ error: "No tiene permisos para asignar el rol Admin" }, { status: 403 });
       }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select();

    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}