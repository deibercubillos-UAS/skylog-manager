import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    // 1. Extraer info enviada por ePayco
    const status = data.x_cod_response; // 1 = Aceptada
    const planSolicitado = data.x_extra1; // escuadrilla o flota
    const userId = data.x_extra2;        // ID de Supabase
    const ciclo = data.x_extra3;         // mensual o anual

    // 2. Conectar a Supabase con permisos de sistema (Service Role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 3. Si el pago es exitoso, activamos el plan
    if (status === "1") {
      console.log(`✅ Pago exitoso: Activando ${planSolicitado} (${ciclo}) para usuario ${userId}`);

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_plan: planSolicitado,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
    } 
    
    // 4. Si el pago falla (para suscripciones recurrentes futuras)
    else if (status === "2" || status === "4") {
      console.log(`❌ Pago fallido para usuario ${userId}. Reintentando o bajando a Piloto.`);
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });

  } catch (err) {
    console.error("Error en Webhook:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}