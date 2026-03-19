import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Obtenemos las plantillas de mitigación configuradas por el usuario
    const { data, error } = await supabase
      .from('sora_templates')
      .select('*')
      .eq('owner_id', userId)
      .order('category', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}