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

        // LOG PARA DEPURACIÓN (Ver en Vercel Logs)
        console.log("Datos recibidos en API:", { token: !!token, planId, userId, email });

        // Validación estricta
        if (!token || !planId || !userId || !email) {
            return NextResponse.json({ 
                error: `Faltan campos: ${!token ? 'token ' : ''}${!planId ? 'planId ' : ''}${!userId ? 'userId ' : ''}${!email ? 'email' : ''}` 
            }, { status: 400 });
        }

        // 1. CREAR CLIENTE
        const customer = await epayco.customers.create({
            token_card: token,
            name: name || "Usuario BitaFly",
            email: email,
            default: true
        });

        if (!customer.success) throw new Error("ePayco Customer Error: " + customer.message);

        // 2. CREAR SUSCRIPCIÓN
        const subscription = await epayco.subscriptions.create({
            id_plan: planId,
            customer: customer.data.customerId,
            token_card: token,
            doc_type: "CC",
            doc_number: "12345678"
        });

        if (!subscription.success) throw new Error("ePayco Subscription Error: " + subscription.message);

        // 3. ACTUALIZAR BASE DE DATOS
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_plan: planKey,
                epayco_customer_id: customer.data.customerId,
                epayco_subscription_id: subscription.data.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("Falla en suscripción:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}