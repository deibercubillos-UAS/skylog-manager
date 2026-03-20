import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Recibir datos de ePayco (vienen como URLSearchParams)
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    // 2. Extraer datos clave
    const status = data.x_cod_response; // 1 = Aceptada, 2 = Rechazada, 3 = Pendiente
    const email = data.x_customer_email;
    const planSolicitado = data.x_extra1?.toLowerCase(); // 'escuadrilla' o 'flota'
    const refPayco = data.x_ref_payco;

    console.log(`Pago recibido de ${email}. Estatus: ${status}. Plan: ${planSolicitado}`);

    // 3. Si el pago es exitoso (Código 1)
    if (status === "1") {
      // Conectar a Supabase con la Service Role Key (Bypassing RLS para actualizar el plan)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY // REQUERIDO PARA ACTUALIZAR SIN SESIÓN
      );

      // 4. Actualizar el plan en el perfil del usuario
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_plan: planSolicitado,
          updated_at: new Date().toISOString()
        })
        .eq('email', email); // Identificamos al usuario por su correo

      if (error) {
        console.error("Error actualizando plan:", error);
        return NextResponse.json({ error: "Error en DB" }, { status: 500 });
      }

      console.log(`✅ Plan ${planSolicitado} activado para ${email}`);
    }

    return NextResponse.json({ message: "Recibido" }, { status: 200 });

  } catch (err) {
    console.error("Error en Webhook:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}