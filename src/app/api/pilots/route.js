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
      .from('pilots')
      .select('*')
      .eq('owner_id', userId)
      .order('name', { ascending: true });

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
    const { userId, pilotData, currentPlan, currentCount } = body;

    if (!canAddResource(currentPlan, currentCount, 'pilot')) {
      return NextResponse.json({ error: "Límite de plan alcanzado" }, { status: 403 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data, error } = await supabase
      .from('pilots')
      .insert([{ ...pilotData, owner_id: userId }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}