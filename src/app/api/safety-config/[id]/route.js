import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    // --- CAMBIO CLAVE PARA NEXT.JS 16 ---
    const resolvedParams = await params; 
    const id = resolvedParams.id;
    // ------------------------------------

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || userId === 'undefined' || !authHeader) {
      return NextResponse.json({ error: "Sesión inválida o ID de usuario no recibido" }, { status: 401 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    
    if (profile?.role !== 'admin' && profile?.role !== 'gerente_sms') {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const table = type === 'checklist' ? 'checklist_templates' : 'sora_templates';
    
    // Verificamos que el ID no sea undefined antes de ir a la DB
    if (!id || id === 'undefined') throw new Error("ID de item inválido");

    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: "Eliminado con éxito" });

  } catch (err) {
    console.error("Error en Delete API:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}