import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // 1. CARGAR LLAVES DE LA API REST (Únicas válidas para este login)
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        if (!publicKey || !privateKey) {
            throw new Error("Faltan llaves PUBLIC_KEY o PRIVATE_KEY en el servidor.");
        }

        // 2. LOGIN EN EPAYCO (Obtener Token Bearer)
        // El servidor de ePayco exige public_key y private_key en el body
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                public_key: publicKey,
                private_key: privateKey
            })
        });

        const authData = await authRes.json();
        
        // Verificamos si el token llegó
        const bearerToken = authData.token || authData.data?.token;

        if (!bearerToken) {
            console.error("Respuesta ePayco Auth Fallida:", authData);
            throw new Error(`ePayco Auth: ${authData.message || 'Error de llaves'}`);
        }

        // Definimos los encabezados seguros para los siguientes pasos
        const secureHeaders = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        };

        // 3. CREAR CLIENTE EN EPAYCO
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

        // 4. CREAR SUSCRIPCIÓN RECURRENTE
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
        
        if (!subscription.success) {
            throw new Error("ePayco Suscripción: " + subscription.message);
        }

        // 5. ACTUALIZAR SUPABASE (ADMIN ROLE)
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