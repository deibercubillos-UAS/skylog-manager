import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        const status = String(data.x_cod_response); // 1 = Aceptada
        const userId = data.x_extra2;               
        const planSolicitado = data.x_extra1;       
        const subscriptionId = data.x_id_invoice;   

        console.log(`🔔 WEBHOOK: Procesando Pago ${status} para Usuario ${userId}`);

        // --- INICIO: VALIDACIÓN DE SEGURIDAD EPAYCO ---
        const p_cust_id_cliente = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID || data.x_cust_id_cliente;
        const p_key = process.env.EPAYCO_P_KEY; // DEBE ESTAR EN TU .env
        
        if (p_key) {
            const signatureStr = `${p_cust_id_cliente}^${p_key}^${data.x_ref_payco}^${data.x_transaction_id}^${data.x_amount}^${data.x_currency_code}`;
            const expectedSignature = crypto.createHash('sha256').update(signatureStr).digest('hex');
            
            if (expectedSignature !== data.x_signature) {
                console.error("❌ Firma inválida en Webhook. Posible ataque detectado.");
                return NextResponse.json({ error: "Firma inválida" }, { status: 403 });
            }
        } else {
            console.warn("⚠️ ADVERTENCIA: EPAYCO_P_KEY no definida en variables de entorno. Validación saltada.");
        }
        // --- FIN: VALIDACIÓN DE SEGURIDAD ---

        if (status === "1" && userId) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ 
                    subscription_plan: planSolicitado,
                    epayco_subscription_id: subscriptionId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;
            console.log(`✅ Plan ${planSolicitado} ACTIVADO exitosamente.`);
        }

        return NextResponse.json({ message: "OK" });

    } catch (err) {
        console.error("💥 Error Crítico Webhook:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
