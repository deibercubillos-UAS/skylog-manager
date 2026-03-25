import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    let currentStep = "Iniciando";

    const safeFetch = async (url, options, stepName) => {
        currentStep = stepName;
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const json = await response.json();
            if (response.status >= 400) {
                throw new Error(`[ePayco ${response.status}]: ${json.message || json.description || 'Error de validación'}`);
            }
            return json;
        } else {
            throw new Error(`Error de comunicación (Status ${response.status}). El servidor de ePayco no respondió con JSON.`);
        }
    };

    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // 1. AUTENTICACIÓN
        const authData = await safeFetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        }, "Autenticación");

        const bearerToken = authData.token || authData.bearer_token || (authData.data ? authData.data.token : null);
        const secureHeaders = { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' };

        // 2. CREAR CLIENTE
        const customer = await safeFetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST', headers: secureHeaders,
            body: JSON.stringify({ token_card: token, name, email, default: true })
        }, "Creación de Cliente");
        const customerId = customer.data.customerId;

        // 3. CREAR SUSCRIPCIÓN
        const subscription = await safeFetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST', headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "12345678"
            })
        }, "Alta de Suscripción");

        // 4. EJECUTAR COBRO (URL CORREGIDA: /payment/v1/charge/subscription)
        // Esta es la ruta real de la API REST para el comando 'subscriptions.charge'
        const chargeResult = await safeFetch('https://api.secure.payco.co/payment/v1/charge/subscription', {
            method: 'POST', 
            headers: secureHeaders,
            body: JSON.stringify({ 
                id_plan: planId, 
                customer: customerId, 
                token_card: token, 
                doc_type: "CC",
                doc_number: "12345678",
                ip: ip,
                test: "1" 
            })
        }, "Procesamiento de Pago");

        // 5. VALIDACIÓN DE RESPUESTA
        if (!chargeResult.success || String(chargeResult.data?.cod_respuesta) !== "1") {
            return NextResponse.json({ 
                error: `Pago rechazado: ${chargeResult.data?.respuesta || 'Falla en validación bancaria'}` 
            }, { status: 402 });
        }

        // 6. ACTUALIZAR SUPABASE
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        await supabaseAdmin.from('profiles').update({ 
            subscription_plan: planKey,
            epayco_customer_id: customerId,
            epayco_subscription_id: subscription.data.id,
            updated_at: new Date().toISOString()
        }).eq('id', userId);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("DEBUG ERROR:", err.message);
        return NextResponse.json({ error: `Fallo en ${currentStep}: ${err.message}` }, { status: 500 });
    }
}