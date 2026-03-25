import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // Limpiamos llaves de cualquier espacio invisible
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // 1. LOGIN EPAYCO (Obtener Token de Sesión Fresco)
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        });
        
        const authData = await authRes.json();
        const bearerToken = authData.token || authData.bearer_token || (authData.data ? authData.data.token : null);

        if (!bearerToken) {
            console.error("Respuesta ePayco Auth:", authData);
            throw new Error("No se pudo autenticar con ePayco. Revisa tus API Keys.");
        }

        const secureHeaders = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        };

        // 2. CREAR CLIENTE
        const customerRes = await fetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({ token_card: token, name, email, default: true })
        });
        const customer = await customerRes.json();
        if (!customer.success) throw new Error("Cliente: " + (customer.message || "Error de tokenización"));

        const customerId = customer.data.customerId;

        // 3. CREAR SUSCRIPCIÓN
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "1010101010"
            })
        });
        const subscription = await subRes.json();
        if (!subscription.success) throw new Error("Suscripción: " + subscription.message);

        // 4. ACTUALIZAR SUPABASE
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        await supabaseAdmin.from('profiles').update({ 
            subscription_plan: planKey,
            epayco_customer_id: customerId,
            epayco_subscription_id: subscription.data.id,
            updated_at: new Date().toISOString()
        }).eq('id', userId);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("ERROR_SUBSCRIPTION:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}