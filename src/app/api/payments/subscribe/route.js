import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Cargamos el SDK de ePayco
const epayco = require('epayco-sdk-node')({
    apiKey: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
    privateKey: process.env.EPAYCO_PRIVATE_KEY,
    lang: 'ES',
    test: true // Cambiar a false en producción
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        if (!token || !planId || !userId) {
            return NextResponse.json({ error: "Faltan datos obligatorios para la suscripción" }, { status: 400 });
        }

        // 1. CREAR CLIENTE EN EL PANEL DE EPAYCO
        const customerInfo = {
            token_card: token,
            name: name,
            email: email,
            default: true
        };

        const customer = await epayco.customers.create(customerInfo);
        if (!customer.success) throw new Error("Error ePayco Customer: " + customer.message);

        const customerId = customer.data.customerId;

        // 2. CREAR SUSCRIPCIÓN RECURRENTE
        const subscriptionInfo = {
            id_plan: planId,
            customer: customerId,
            token_card: token,
            doc_type: "CC",
            doc_number: "12345678" 
        };

        const subscription = await epayco.subscriptions.create(subscriptionInfo);
        if (!subscription.success) throw new Error("Error ePayco Subscription: " + subscription.message);

        // 3. ACTUALIZAR PERFIL EN SUPABASE (Usando Service Role para saltar RLS)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const planName = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_plan: planName,
                epayco_customer_id: customerId,
                epayco_subscription_id: subscription.data.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, message: "Membresía activada" });

    } catch (err) {
        console.error("Falla en API Subscribe:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
