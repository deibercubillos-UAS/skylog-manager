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
      .from('flights')
      .select('*, pilots(name), aircraft(model, serial_number)')
      .eq('owner_id', userId)
      .order('flight_date', { ascending: false });

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
    const { userId, flightData } = body;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Inserción oficial del registro de vuelo
    const { data, error } = await supabase
      .from('flights')
      .insert([{ 
        ...flightData, 
        owner_id: userId,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    
    return NextResponse.json({ message: "Vuelo registrado y horas de aeronave actualizadas", data: data[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}