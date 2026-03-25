import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // Limpieza de IP: ePayco no acepta listas de IPs, solo una.
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // 1. LOGIN EPAYCO
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        });
        
        if (!authRes.ok) throw new Error("Falla en comunicación inicial con ePayco");
        const authData = await authRes.json();
        const bearerToken = authData.token || authData.bearer_token || (authData.data ? authData.data.token : null);

        if (!bearerToken) throw new Error("No se pudo obtener token de sesión de ePayco");

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
        if (!customer.success) throw new Error("ePayco Cliente: " + customer.message);
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
        if (!subscription.success) throw new Error("ePayco Suscripción: " + subscription.message);

        // 4. EJECUTAR COBRO (subscriptions.charge)
        const chargeRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/charge', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                ip: ip
            })
        });

        const chargeResult = await chargeRes.json();

        // 5. VALIDACIÓN DE RESPUESTA DE PAGO
        // El código 1 es 'Aceptada' en ePayco
        if (!chargeResult.success || String(chargeResult.data?.cod_respuesta) !== "1") {
            return NextResponse.json({ 
                error: `Transacción ${chargeResult.data?.respuesta || 'Rechazada'}. Verifique los fondos de su tarjeta.` 
            }, { status: 402 });
        }

        // 6. ACTUALIZAR BASE DE DATOS
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

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("Error en proceso de suscripción:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}