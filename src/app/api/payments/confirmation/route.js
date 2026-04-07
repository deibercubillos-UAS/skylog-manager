import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // 1. Recibir datos de ePayco (Form Data)
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        // 2. Extraer variables clave enviadas desde ePayco
        const status = String(data.x_cod_response); // 1 = Aceptada
        const userId = data.x_extra2;               // ID del usuario de BitaFly
        const planSolicitado = data.x_extra1;       // escuadrilla o flota
        const subscriptionId = data.x_id_invoice;   // ID técnico de suscripción

        console.log(`🔔 WEBHOOK RECIBIDO: Usuario ${userId}, Estado ${status}, Plan ${planSolicitado}`);

        // 3. Si el pago es exitoso (1)
        if (status === "1") {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY // Llave maestra
            );

            // Actualizamos el plan del usuario
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: planSolicitado,
                    epayco_subscription_id: subscriptionId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error("❌ Error actualizando DB:", error.message);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            
            console.log("✅ Plan actualizado exitosamente vía Webhook");
        }

        return NextResponse.json({ message: "Recibido correctamente" }, { status: 200 });

    } catch (err) {
        console.error("💥 Error en Webhook:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}