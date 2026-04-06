import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        // LOG PARA DEPURACIÓN (Lo verás en Vercel Logs)
        console.log("=== WEBHOOK BITAFLY: NUEVO MENSAJE ===");
        console.log("Usuario ID (extra2):", data.x_extra2);
        console.log("Plan (extra1):", data.x_extra1);
        console.log("Estado Pago (cod_response):", data.x_cod_response);

        const status = String(data.x_cod_response); 
        const userId = data.x_extra2; 
        const planSolicitado = data.x_extra1;
        const subscriptionId = data.x_id_invoice;

        // 1. Solo si el pago fue aprobado (Código 1)
        if (status === "1" && userId) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY // Asegúrate que esté en Vercel
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
                console.error("❌ Error de Supabase:", error.message);
            } else {
                console.log(`✅ EXITO: Plan ${planSolicitado} activado para ${userId}`);
            }
        }

        return NextResponse.json({ message: "Procesado" });

    } catch (err) {
        console.error("❌ ERROR CRÍTICO WEBHOOK:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}