import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const epayco = require('epayco-sdk-node')({
    apiKey: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: true
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // --- VALIDACIÓN ULTRA-ESTRICTA ---
        const missingFields = [];
        if (!token) missingFields.push("token_tarjeta");
        if (!planId) missingFields.push("id_plan_epayco");
        if (!userId) missingFields.push("id_usuario_bitafly");
        if (!email) missingFields.push("email_usuario");

        if (missingFields.length > 0) {
            return NextResponse.json({ 
                error: `Faltan datos: ${missingFields.join(', ')}` 
            }, { status: 400 });
        }

        // 1. Crear Cliente en ePayco
        const customer = await epayco.customers.create({
            token_card: token,
            name: name || "Usuario BitaFly",
            email: email,
            default: true
        });

        if (!customer.success) throw new Error("ePayco Customer: " + customer.message);

        // 2. Crear Suscripción
        const subscription = await epayco.subscriptions.create({
            id_plan: planId,
            customer: customer.data.customerId,
            token_card: token,
            doc_type: "CC",
            doc_number: "12345678"
        });

        if (!subscription.success) throw new Error("ePayco Sub: " + subscription.message);

        // 3. Actualizar Supabase
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_plan: planKey,
                epayco_customer_id: customer.data.customerId,
                epayco_subscription_id: subscription.data.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("API Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}