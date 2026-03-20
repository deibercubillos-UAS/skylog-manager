import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    const authHeader = request.headers.get('Authorization');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Cambiamos el plan a 'piloto' (Baja de servicio)
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_plan: 'piloto', updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;
    return NextResponse.json({ message: "Suscripción cancelada. Has vuelto al Plan Piloto." });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}