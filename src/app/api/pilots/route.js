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

    // Obtenemos la organización del usuario para guardarla junto al piloto
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('pilots')
      .insert([{
        ...pilotData,
        owner_id: userId,
        organization_id: profile?.organization_id,
        is_active: true
      }])
      .select();

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
    const { userId, pilotData, currentPlan } = body;

    // Contamos en el servidor, NO confiamos en el cliente
    const { count: realCount } = await supabase
      .from('pilots')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('is_active', true);

    if (!canAddResource(currentPlan, realCount || 0, 'pilot')) {
      return NextResponse.json({ error: "Límite de plan alcanzado" }, { status: 403 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

   // Buscamos la organización del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}