import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // 1. Recibir datos de ePayco (vienen como Form-Data)
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        const status = String(data.x_cod_response); // 1 = Aceptada
        const userId = data.x_extra2;               // ID del usuario que enviamos
        const planSolicitado = data.x_extra1;       // escuadrilla o flota
        const subscriptionId = data.x_id_invoice;   // ID de suscripción de ePayco

        console.log(`🔔 WEBHOOK: Procesando Pago ${status} para Usuario ${userId}`);

        // 2. Solo si el pago es ACEPTADO (Código 1)
        if (status === "1" && userId) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY // <--- CLAVE MAESTRA REQUERIDA
            );

            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: planSolicitado,
                    epayco_subscription_id: subscriptionId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error("❌ Error DB Webhook:", error.message);
                return NextResponse.json({ error: "Database error" }, { status: 500 });
            }
            
            console.log(`✅ Plan ${planSolicitado} ACTIVADO exitosamente.`);
        }

        return NextResponse.json({ message: "OK" });

    } catch (err) {
        console.error("💥 Error Crítico Webhook:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}