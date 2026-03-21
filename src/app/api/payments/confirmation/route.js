import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    // 1. Datos del Pago
    const status = data.x_cod_response; // 1=Aceptada, 2=Rechazada, 4=Fallida
    const email = data.x_customer_email;
    const planSolicitado = data.x_extra1?.toLowerCase(); // 'escuadrilla' o 'flota'
    const userId = data.x_extra2; // <--- USAR ID ES MÁS SEGURO QUE EL EMAIL
    const cycle = data.x_extra3; // 'anual' o 'mensual'
    console.log(`Pago ${status} de BitaFly. Ciclo: ${cycle}`);

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. CASO: PAGO EXITOSO (Activar o Mantener Plan)
    if (status === "1") {
      console.log(`✅ Activando plan ${planSolicitado} para el usuario ${userId || email}`);
      
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_plan: planSolicitado,
          updated_at: new Date().toISOString()
        })
        .eq(userId ? 'id' : 'email', userId || email); // Busca por ID si existe, si no por Email

      if (error) throw error;
    } 
    
    // 3. CASO: PAGO RECHAZADO O FALLIDO (Bajar a Plan Piloto)
    // Esto es vital para las suscripciones recurrentes que fallan el segundo mes
    else if (status === "2" || status === "4") {
      console.log(`❌ Pago fallido para ${email}. Revocando acceso PRO.`);
      
      await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_plan: 'piloto',
          updated_at: new Date().toISOString()
        })
        .eq(userId ? 'id' : 'email', userId || email);
    }

    return NextResponse.json({ message: "Webhook procesado" }, { status: 200 });

  } catch (err) {
    console.error("Error en Webhook:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}