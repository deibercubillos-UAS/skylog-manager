import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // ePayco envía los datos como FormData (x-www-form-urlencoded)
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        console.log("=== WEBHOOK BITAFLY RECIBIDO ===");
        console.log("ID Factura:", data.x_id_invoice);
        console.log("Respuesta Cod:", data.x_cod_response);
        console.log("Email:", data.x_customer_email);

        const status = String(data.x_cod_response); 
        const userId = data.x_extra2; // ID de Supabase que enviamos
        const planSolicitado = data.x_extra1; // escuadrilla o flota

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Si el pago es exitoso (1)
        if (status === "1") {
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: planSolicitado,
                    epayco_subscription_id: data.x_id_invoice,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) console.error("Error DB:", error.message);
            else console.log("✅ Plan actualizado con éxito via Webhook");
        }

        return NextResponse.json({ message: "OK" });
    } catch (err) {
        console.error("❌ Error en Webhook:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}