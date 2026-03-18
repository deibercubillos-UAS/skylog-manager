import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { canAddResource } from '@/lib/planLimits';

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
      .from('aircraft')
      .select('*')
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
    const { userId, aircraftData, currentPlan } = body;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. VALIDACIÓN DE PLAN EN SERVIDOR
    const { count } = await supabase.from('aircraft').select('*', { count: 'exact', head: true }).eq('owner_id', userId);
    
    if (!canAddResource(currentPlan, count || 0, 'drone')) {
      return NextResponse.json({ error: `Tu plan ${currentPlan.toUpperCase()} ha llegado al límite de aeronaves.` }, { status: 403 });
    }

    // 2. INSERCIÓN
    const { data, error } = await supabase
      .from('aircraft')
      .insert([{ ...aircraftData, owner_id: userId, status: 'Operativo' }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}