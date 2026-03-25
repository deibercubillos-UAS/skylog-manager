import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    let log = []; // Para rastrear qué pasa internamente

    const safeFetch = async (url, options, stepName) => {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const json = await response.json();
            if (!response.ok || json.success === false) {
                const errorDetail = json.data?.errors?.[0]?.message || json.message || json.description || "Error desconocido";
                throw new Error(`${stepName}: ${errorDetail}`);
            }
            return json;
        } else {
            const text = await response.text();
            console.error(`Error no JSON en ${stepName}:`, text);
            throw new Error(`${stepName}: El servidor respondió con un error técnico (HTML). Verifica el ID del Plan.`);
        }
    };

    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // --- PASO 1: AUTENTICACIÓN (LOGIN) ---
        const authData = await safeFetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        }, "Autenticación");

        const bearerToken = authData.token || authData.bearer_token || (authData.data ? authData.data.token : null);
        const secureHeaders = { 
            'Authorization': `Bearer ${bearerToken}`, 
            'Content-Type': 'application/json' 
        };

        // --- PASO 2: CREAR CLIENTE ---
        const customer = await safeFetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST', 
            headers: secureHeaders,
            body: JSON.stringify({ token_card: token, name, email, default: true })
        }, "Creación de Cliente");
        const customerId = customer.data.customerId;

        // --- PASO 3: CREAR SUSCRIPCIÓN ---
        // Este paso, según ePayco, ya dispara el proceso de activación y cobro.
        const subscription = await safeFetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST', 
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "1010101010"
            })
        }, "Alta de Suscripción");

        // SI LLEGAMOS AQUÍ, LA SUSCRIPCIÓN SE CREÓ EXITOSAMENTE
        // No haremos el Paso 4 (Charge) manualmente para evitar el error 405.

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

        if (dbError) throw new Error("Error DB: " + dbError.message);

        return NextResponse.json({ success: true, message: "Suscripción procesada" });

    } catch (err) {
        console.error("FALLA EN BITAFLY:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}