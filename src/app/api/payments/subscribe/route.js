import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // 1. OBTENER LLAVES (Aseguramos que no tengan espacios)
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        if (!publicKey || !privateKey) {
            throw new Error("Llaves de ePayco no configuradas en el servidor.");
        }

        // 2. NUEVO MÉTODO DE LOGIN (Enviando llaves en el BODY)
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                public_key: publicKey,
                private_key: privateKey
            })
        });

        const authData = await authRes.json();
        
        // Verificación del token de sesión
        if (!authData.token) {
            console.error("Respuesta ePayco Auth:", authData);
            throw new Error("ePayco Auth: " + (authData.message || "Error de llaves"));
        }

        const bearerToken = authData.token;

        // 3. CONFIGURAR HEADERS PARA LAS OPERACIONES
        const secureHeaders = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        };

        // 4. CREAR CLIENTE
        const customerRes = await fetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                token_card: token,
                name: name,
                email: email,
                default: true
            })
        });

        const customer = await customerRes.json();
        if (!customer.success) throw new Error("ePayco Cliente: " + customer.message);

        const customerId = customer.data.customerId;

        // 5. CREAR SUSCRIPCIÓN
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "12345678",
                url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
                method_confirmation: "POST"
            })
        });

        const subscription = await subRes.json();
        if (!subscription.success) throw new Error("ePayco Suscripción: " + subscription.message);

        // 6. ACTUALIZAR SUPABASE
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_plan: planKey,
                epayco_customer_id: customerId,
                epayco_subscription_id: subscription.data.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        return NextResponse.json({ success: true, message: "Plan Activado" });

    } catch (err) {
        console.error("CRITICAL_PAYMENT_ERROR:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}