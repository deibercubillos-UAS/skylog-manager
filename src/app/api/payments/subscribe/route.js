import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // Capturamos la IP del cliente (Requisito obligatorio para el cobro)
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // 1. LOGIN EN EPAYCO PARA OBTENER TOKEN
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        });
        const authData = await authRes.json();
        const bearerToken = authData.token || authData.bearer_token || (authData.data ? authData.data.token : null);

        if (!bearerToken) throw new Error("Fallo de autenticación en ePayco");

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
        if (!customer.success) throw new Error("Error Cliente: " + customer.message);
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
                doc_number: "12345678"
            })
        });
        const subscription = await subRes.json();
        if (!subscription.success) throw new Error("Error Suscripción: " + subscription.message);

        // 4. EJECUTAR COBRO (La lógica de la imagen: subscriptions.charge)
        // Esto verifica si la tarjeta realmente tiene dinero y autoriza la transacción
        const chargeRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/charge', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "12345678",
                ip: ip // IP obligatoria
            })
        });

        const chargeResult = await chargeRes.json();

        // 5. VALIDAR SI EL COBRO FUE EXITOSO
        // Si el estado no es 'Aceptada' (usualmente cod_respuesta 1), lanzamos error y NO actualizamos la DB
        if (!chargeResult.success || chargeResult.data.cod_respuesta !== 1) {
            console.error("Transacción Rechazada:", chargeResult);
            return NextResponse.json({ 
                error: `Pago rechazado: ${chargeResult.data?.respuesta || 'Verifique los fondos de su tarjeta'}` 
            }, { status: 402 }); // 402 = Payment Required
        }

        // 6. ACTUALIZAR SUPABASE (Solo si el cobro fue exitoso)
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

        return NextResponse.json({ success: true, message: "Pago exitoso y plan activado" });

    } catch (err) {
        console.error("CRITICAL_BACKEND_ERROR:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}