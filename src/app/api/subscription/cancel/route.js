import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID requerido" }, { status: 400 });
    }

    // Usamos la llave maestra para asegurar que la base de datos permita el cambio
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_plan: 'piloto',
        epayco_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Suscripción cancelada localmente." });

  } catch (err) {
    console.error("Error en cancelación:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}