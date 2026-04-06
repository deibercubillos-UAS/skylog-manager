import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        // ePayco envía x_cod_response: 1 para transacciones exitosas
        const status = String(data.x_cod_response); 
        const userId = data.x_extra2; 
        const planSolicitado = data.x_extra1;
        const subscriptionId = data.x_id_invoice; // Este es el ID de la suscripción real

        console.log(`🔔 WEBHOOK: Recibido estado ${status} para usuario ${userId}`);

        if (status === "1") {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: planSolicitado,
                    epayco_subscription_id: subscriptionId, // Guardamos el ID de suscripción
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;
            console.log("✅ Plan BitaFly Pro activado correctamente.");
        }

        return NextResponse.json({ message: "Recibido" });

    } catch (err) {
        console.error("❌ Error Webhook:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}