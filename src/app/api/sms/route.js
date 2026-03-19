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

    const { data, error } = await supabase
      .from('sms_reports')
      .select('*, flights(flight_number, location)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get('Authorization');
    const { userId, reportData } = body;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // --- VALIDACIÓN DE SEGURIDAD EN SERVIDOR ---
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
    
    if (profile.role !== 'admin' && profile.role !== 'gerente_sms') {
      return NextResponse.json({ error: "Solo el Gerente SMS puede emitir reportes oficiales." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('sms_reports')
      .insert([{ ...reportData, owner_id: userId }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}