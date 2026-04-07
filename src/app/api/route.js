// FILE: src/app/api/form-templates/route.js
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// Obtener todas las plantillas del usuario
export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('owner_id', user.id)
      .order('name');
      
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return new NextResponse(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

// Crear una nueva plantilla de formulario
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse(JSON.stringify({ error: 'No autorizado' }), { status: 401 });

    const body = await request.json();
    const { name, form_code, version, schema } = body;

    const { data, error } = await supabase
      .from('form_templates')
      .insert([{ owner_id: user.id, name, form_code, version, schema }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return new NextResponse(JSON.stringify({ error: err.message }), { status: 500 });
  }
}