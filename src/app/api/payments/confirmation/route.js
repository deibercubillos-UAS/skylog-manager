import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // 1. Leer los datos enviados por ePayco (Form Data con prefijo x_)
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        console.log("🔔 Webhook Recibido de ePayco:", data.x_id_invoice);

        // 2. Extraer variables clave
        const status = String(data.x_cod_response); // 1=Aceptada, 2=Rechazada, 4=Fallida
        const userId = data.x_extra2;               // El ID que enviamos desde el front
        const planSolicitado = data.x_extra1;       // escuadrilla o flota
        const subscriptionId = data.x_id_invoice;   // ID de suscripción en ePayco

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 3. CASO: PAGO ACEPTADO (Activación)
        if (status === "1") {
            console.log(`✅ Activando ${planSolicitado} para usuario ${userId}`);
            await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: planSolicitado,
                    epayco_subscription_id: subscriptionId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
        } 
        // 4. CASO: PAGO RECHAZADO, FALLIDO O CANCELADO (Degradación)
        else {
            console.log(`❌ Pago/Suscripción Inactiva (Status: ${status}). Volviendo a Piloto.`);
            await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: 'piloto',
                    epayco_subscription_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
        }

        return NextResponse.json({ message: "Webhook procesado" }, { status: 200 });

    } catch (err) {
        console.error("💥 Error Crítico Webhook:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}