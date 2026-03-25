import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // 1. OBTENER LLAVES
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
        const privateKey = process.env.EPAYCO_PRIVATE_KEY;

        // 2. PASO RECOMENDADO POR ASESOR: LOGIN PARA OBTENER TOKEN DE SESIÓN
        // Este token tiene un tiempo de expiración corto (60 min)
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(publicKey + ':' + privateKey).toString('base64')}`
            }
        });

        const authData = await authRes.json();
        
        if (!authData.token) {
            console.error("Falla en Auth ePayco:", authData);
            throw new Error("No se pudo iniciar sesión en ePayco: " + (authData.message || "Credenciales inválidas"));
        }

        const bearerToken = authData.token;

        // 3. CONFIGURAR HEADERS CON EL NUEVO TOKEN DE SESIÓN
        const secureHeaders = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        };

        // 4. CREAR CLIENTE EN EPAYCO
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

        // 5. CREAR SUSCRIPCIÓN RECURRENTE
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

        // 6. ACTUALIZAR PERFIL EN SUPABASE (Service Role)
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

        return NextResponse.json({ success: true, message: "BitaFly Pro Activado" });

    } catch (err) {
        console.error("ERROR SMS/PAYMENT:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}