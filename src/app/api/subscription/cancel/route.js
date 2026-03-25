import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Obtener ID de Suscripción guardado en Supabase
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('epayco_subscription_id')
      .eq('id', userId)
      .single();

    if (profile?.epayco_subscription_id) {
      // 2. AUTH: Login en ePayco para obtener JWT (Requerido por API Actualizada)
      const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY.trim(),
          private_key: process.env.EPAYCO_PRIVATE_KEY.trim()
        })
      });
      
      const authData = await authRes.json();
      const bearerToken = authData.token || authData.bearer_token || authData.data?.token;

      // 3. CANCELACIÓN: Llamada al nuevo endpoint oficial
      const cancelRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
          'type': 'sdk-jwt' // Cabecera técnica obligatoria según documentación
        },
        body: JSON.stringify({ id: profile.epayco_subscription_id })
      });

      const cancelResult = await cancelRes.json();
      console.log("Resultado ePayco Cancel:", cancelResult);
    }

    // 4. ACTUALIZACIÓN EN BITAFLY: Volver a Plan Piloto
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_plan: 'piloto',
        epayco_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "Membresía cancelada con éxito." });

  } catch (err) {
    console.error("Error en cancelación:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}