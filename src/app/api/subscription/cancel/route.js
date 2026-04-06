import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    // 1. Conexión Administrativa a Supabase (Maestra)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Obligatoria en Vercel
    );

    // 2. Obtener el ID de la suscripción activa
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('epayco_subscription_id')
      .eq('id', userId)
      .single();

    // 3. Intento de cancelación en ePayco (Si existe ID)
    if (profile?.epayco_subscription_id) {
      try {
        // Auth en ePayco
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY.trim(),
            private_key: process.env.EPAYCO_PRIVATE_KEY.trim()
          })
        });
        const authData = await authRes.json();
        const token = authData.token || authData.bearer_token || authData.data?.token;

        // Petición de Cancelación oficial
        await fetch('https://api.secure.payco.co/recurring/v1/subscription/cancel', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'type': 'sdk-jwt' 
          },
          body: JSON.stringify({ id: profile.epayco_subscription_id })
        });
        console.log("✅ Cancelación enviada a ePayco");
      } catch (e) {
        console.error("⚠️ ePayco no respondió, pero limpiaremos la base de datos local.");
      }
    }

    // 4. ACTUALIZACIÓN FORZADA EN BITAFLY
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_plan: 'piloto',
        epayco_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "Suscripción dada de baja." });

  } catch (err) {
    console.error("Error crítico en cancelación:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}