import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // 1. Obtener ID de Suscripción de la DB
    const { data: profile } = await supabaseAdmin.from('profiles').select('epayco_subscription_id').eq('id', userId).single();

    if (profile?.epayco_subscription_id) {
      // 2. AUTH EPAYCO
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

      // 3. CANCELAR EN SERVIDOR EPAYCO
      await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ id: profile.epayco_subscription_id })
      });
    }

    // 4. BAJAR A PLAN PILOTO SIEMPRE (Aunque ePayco falle, liberamos al usuario en nuestra DB)
    await supabaseAdmin.from('profiles').update({ 
      subscription_plan: 'piloto',
      epayco_subscription_id: null,
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    return NextResponse.json({ message: "Suscripción cancelada." });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}