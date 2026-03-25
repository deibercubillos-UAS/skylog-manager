import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Obtener el ID de la suscripción activa del usuario
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('epayco_subscription_id')
      .eq('id', userId)
      .single();

    if (profile?.epayco_subscription_id) {
      // 2. LOGIN EN EPAYCO (Para obtener permiso de cancelación)
      const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY.trim(),
          private_key: process.env.EPAYCO_PRIVATE_KEY.trim()
        })
      });
      const authData = await authRes.json();
      const bearerToken = authData.token || authData.data?.token;

      // 3. LLAMADA DE CANCELACIÓN A EPAYCO (Equivalente al código de la asesora)
      // Usamos la ruta REST oficial para suscripciones
      await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ id: profile.epayco_subscription_id })
      });
      
      console.log(`Suscripción ${profile.epayco_subscription_id} cancelada en ePayco`);
    }

    // 4. ACTUALIZAR SUPABASE (Bajar a Plan Piloto)
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_plan: 'piloto',
        epayco_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (dbError) throw dbError;

    return NextResponse.json({ message: "Suscripción cancelada exitosamente." });

  } catch (err) {
    console.error("Error en cancelación:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}