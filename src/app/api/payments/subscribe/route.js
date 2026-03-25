import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    let currentStep = "Iniciando";

    // Función auxiliar para procesar respuestas de ePayco
    const processResponse = async (response, stepName) => {
        currentStep = stepName;
        const json = await response.json();
        
        // ePayco usa 'status' o 'success'. Validamos ambos.
        const isOk = response.ok && (json.status === true || json.success === true || json.status === 'success');
        
        if (!isOk) {
            const errorMsg = json.message || json.description || json.data?.errors?.[0]?.message || "Error desconocido";
            throw new Error(errorMsg);
        }
        return json;
    };

    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();
        
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

        // --- PASO 1: LOGIN (OBTENER TOKEN DE SESIÓN) ---
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        });
        
        const authData = await processResponse(authRes, "Autenticación");
        
        // Extraemos el token de donde sea que ePayco lo envíe
        const bearerToken = authData.token || authData.data?.token || authData.bearer_token;

        if (!bearerToken) throw new Error("Token de sesión no encontrado en la respuesta");

        const secureHeaders = { 
            'Authorization': `Bearer ${bearerToken}`, 
            'Content-Type': 'application/json' 
        };

        // --- PASO 2: CREAR CLIENTE ---
        const customerRes = await fetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({ token_card: token, name, email, default: true })
        });
        const customerData = await processResponse(customerRes, "Creación de Cliente");
        const customerId = customerData.data.customerId;

        // --- PASO 3: CREAR SUSCRIPCIÓN ---
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "1010101010",
                url_confirmation: `https://bitafly.com/api/payments/confirmation`,
                method_confirmation: "POST"
            })
        });
        const subData = await processResponse(subRes, "Alta de Suscripción");

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
                epayco_subscription_id: subData.data.id,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (dbError) throw new Error("Error en base de datos: " + dbError.message);

        return NextResponse.json({ success: true, message: "BitaFly Pro Activado" });

    } catch (err) {
        console.error("FALLA TÉCNICA:", err.message);
        return NextResponse.json({ error: `Fallo en [${currentStep}]: ${err.message}` }, { status: 500 });
    }
}