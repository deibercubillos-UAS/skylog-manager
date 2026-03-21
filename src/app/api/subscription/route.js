import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
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

        // 1. CREAR CLIENTE EN EPAYCO
        // Esto guarda la tarjeta (tokenizada) vinculada al correo del usuario
        const customerInfo = {
            token_card: token,
            name: name,
            email: email,
            default: true
        };

        const customer = await epayco.customers.create(customerInfo);
        if (!customer.success) throw new Error("Error creando cliente: " + customer.message);

        const customerId = customer.data.customerId;

        // 2. CREAR SUSCRIPCIÓN EN EPAYCO
        // Vinculamos al cliente con el ID del Plan (Escuadrilla o Flota)
        const subscriptionInfo = {
            id_plan: planId,
            customer: customerId,
            token_card: token,
            doc_type: "CC",
            doc_number: "12345678" // Opcional: pedirlo en el form
        };

        const subscription = await epayco.subscriptions.create(subscriptionInfo);
        if (!subscription.success) throw new Error("Error en suscripción: " + subscription.message);

        // 3. ACTUALIZAR BASE DE DATOS (Supabase)
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

        return NextResponse.json({ success: true, message: "Suscripción activada con éxito" });

    } catch (err) {
        console.error("Error en el flujo de pago:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}