import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        // 1. Extraer variables de ePayco (vienen con prefijo x_)
        const status = String(data.x_cod_response); // 1 = Aceptada
        const userId = data.x_extra2;               // El ID de Supabase
        const planSolicitado = data.x_extra1;       // escuadrilla o flota
        const subscriptionId = data.x_id_invoice;   // ID de suscripción de ePayco

        console.log(`🔔 Webhook: Pago ${status} para usuario ${userId}`);

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 2. Si el pago es exitoso (1), activamos el plan
        if (status === "1") {
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: planSolicitado,
                    epayco_subscription_id: subscriptionId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;
            console.log("✅ Plan actualizado en BitaFly");
        }

        return NextResponse.json({ message: "OK" });

    } catch (err) {
        console.error("❌ Error en Webhook:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}