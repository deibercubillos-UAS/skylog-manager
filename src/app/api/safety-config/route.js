import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// OBTENER PROTOCOLOS
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Consultamos ambas tablas en paralelo
    const [checklist, sora] = await Promise.all([
      supabase.from('checklist_templates').select('*').eq('owner_id', userId).order('category'),
      supabase.from('sora_templates').select('*').eq('owner_id', userId).order('category')
    ]);

    return NextResponse.json({
      checklist: checklist.data || [],
      sora: sora.data || []
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// CREAR NUEVO ITEM
export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const { userId, type, data } = body; // type: 'checklist' o 'sora'

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const table = type === 'checklist' ? 'checklist_templates' : 'sora_templates';
    
    const { data: result, error } = await supabase
      .from(table)
      .insert([{ ...data, owner_id: userId }])
      .select();

    if (error) throw error;
    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}