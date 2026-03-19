import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // checklist o sora
    const userId = searchParams.get('userId'); // Lo enviamos desde el frontend
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // --- VALIDACIÓN DE ROL EN EL SERVIDOR ---
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    
    if (profile.role !== 'admin' && profile.role !== 'gerente_sms') {
      return NextResponse.json({ error: "Permisos insuficientes. Solo nivel gerencial puede modificar protocolos." }, { status: 403 });
    }

    const table = type === 'checklist' ? 'checklist_templates' : 'sora_templates';
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ message: "Item eliminado correctamente" });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}