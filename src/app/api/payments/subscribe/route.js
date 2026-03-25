import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // --- PASO 1: LOGIN (PDF Pág. 9) ---
        // Obtenemos el jwt_token (bearer_token)
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                public_key: publicKey,
                private_key: privateKey
            })
        });

        const authData = await authRes.json();
        const bearerToken = authData.bearer_token || authData.token;

        if (!bearerToken) {
            console.error("Error Auth ePayco:", authData);
            return NextResponse.json({ error: "No se pudo autenticar con la pasarela" }, { status: 500 });
        }

        // Configuración de cabeceras para los siguientes pasos (PDF Pág. 10)
        const secureHeaders = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json',
            'type': 'sdk-jwt' // Requerido según el PDF
        };

        // --- PASO 2: CREAR CLIENTE (PDF Pág. 16) ---
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
            return NextResponse.json({ error: `Cliente: ${customer.message}` }, { status: 500 });
        }

        const customerId = customer.data.customerId;

        // --- PASO 3: CREAR SUSCRIPCIÓN (PDF Pág. 30) ---
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "1010101010", // Documento genérico para la creación
                url_confirmation: `https://bitafly.com/api/payments/confirmation`,
                method_confirmation: "POST"
            })
        });

        const subscription = await subRes.json();
        if (!subscription.success) {
            return NextResponse.json({ error: `Suscripción: ${subscription.message}` }, { status: 500 });
        }

        // --- PASO 4: ACTUALIZAR SUPABASE ---
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

        return NextResponse.json({ success: true, message: "BitaFly Pro Activado" });

    } catch (err) {
        console.error("ERROR CRÍTICO:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}