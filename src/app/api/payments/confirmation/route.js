import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const data = Object.fromEntries(formData.entries());

    // 1. Datos del pago y tokenización
    const status = data.x_cod_response; // 1 = Aceptada
    const userId = data.x_extra2;       // Nuestro ID de usuario
    const plan = data.x_extra1;         // Escuadrilla o Flota
    const customerId = data.x_id_invoice; // ID de factura/cliente en epayco
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Si el pago es exitoso, activamos el plan y guardamos el token de cliente
    if (status === "1") {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_plan: plan,
          epayco_customer_id: customerId, // Guardamos la referencia para cobros futuros
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      console.log(`✅ Tokenización exitosa para usuario ${userId}`);
    } 
    
    // 3. Si falla el pago recurrente (meses posteriores)
    else if (status === "2" || status === "4") {
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_plan: 'piloto' })
        .eq('id', userId);
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });

  } catch (err) {
    console.error("Error Webhook:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}