import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // 1. LOGIN PARA OBTENER BEARER TOKEN
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                public_key: publicKey,
                private_key: privateKey
            })
        });

        const authData = await authRes.json();
        
        // ePayco puede devolver el token como 'token' o 'bearer_token' dependiendo de la versión
        const bearerToken = authData.token || authData.bearer_token || (authData.data ? authData.data.token : null);

        if (!bearerToken) {
            console.error("Respuesta inesperada de Auth ePayco:", authData);
            return NextResponse.json({ error: `Fallo de autenticación: ${authData.message || 'Token no recibido'}` }, { status: 500 });
        }

        const secureHeaders = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        };

        // 2. CREAR CLIENTE
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
        if (!customer.success) {
            return NextResponse.json({ error: `ePayco Cliente: ${customer.message || 'Error desconocido'}` }, { status: 500 });
        }

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
                doc_number: "12345678",
                url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
                method_confirmation: "POST"
            })
        });

        const subscription = await subRes.json();
        if (!subscription.success) {
            return NextResponse.json({ error: `ePayco Suscripción: ${subscription.message || 'Error desconocido'}` }, { status: 500 });
        }

        // 4. ACTUALIZAR SUPABASE
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .update({ 
                subscription_plan: planKey,
                epayco_customer_id: customerId,
                epayco_subscription_id: subscription.data.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (dbError) throw dbError;

        return NextResponse.json({ success: true, message: "Suscripción BitaFly Activa" });

    } catch (err) {
        console.error("CRITICAL_BACKEND_ERROR:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}