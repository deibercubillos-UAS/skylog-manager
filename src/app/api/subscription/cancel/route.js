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

    // 1. Obtener ID de Suscripción de BitaFly
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('epayco_subscription_id')
      .eq('id', userId)
      .single();

    // 2. Intento de cancelación en ePayco
    if (profile?.epayco_subscription_id) {
      try {
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY.trim(),
            private_key: process.env.EPAYCO_PRIVATE_KEY.trim()
          })
        });
        const authData = await authRes.json();
        const token = authData.token || authData.data?.token;

        await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ id: profile.epayco_subscription_id })
        });
        console.log("Cancelación enviada a ePayco");
      } catch (ePaycoErr) {
        console.error("ePayco no respondió, procediendo con limpieza local...");
      }
    }

    // 3. LIMPIEZA OBLIGATORIA EN BITAFLY (SUPABASE)
    // Pase lo que pase con ePayco, el usuario vuelve a Plan Piloto en tu App
    await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_plan: 'piloto',
        epayco_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return NextResponse.json({ message: "Plan degradado a Piloto exitosamente." });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}