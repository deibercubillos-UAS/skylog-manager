import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    const authHeader = request.headers.get('Authorization');

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Obtener el ID de suscripción de ePayco desde el perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('epayco_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.epayco_subscription_id) {
       // Si no hay ID de ePayco, solo bajamos a plan piloto en la DB
       await supabaseAdmin.from('profiles').update({ subscription_plan: 'piloto' }).eq('id', userId);
       return NextResponse.json({ message: "Plan degradado localmente." });
    }

    // 2. LOGIN EN EPAYCO PARA CANCELAR
    const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
        private_key: process.env.EPAYCO_PRIVATE_KEY
      })
    });
    const authData = await authRes.json();
    const bearerToken = authData.token || authData.data?.token;

    // 3. LLAMADA DE CANCELACIÓN A EPAYCO
    const cancelRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ id: profile.epayco_subscription_id })
    });

    const cancelResult = await cancelRes.json();

    // 4. ACTUALIZAR SUPABASE (Volver a Piloto)
    await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_plan: 'piloto',
        epayco_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return NextResponse.json({ message: "Suscripción cancelada en ePayco y BitaFly." });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}