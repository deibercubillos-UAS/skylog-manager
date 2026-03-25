import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // 1. VALIDACIÓN DE LLAVES (Seguridad de entorno)
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
        const privateKey = process.env.EPAYCO_PRIVATE_KEY;

        if (!publicKey || !privateKey) {
            console.error("❌ ERROR: Faltan llaves de ePayco en las variables de entorno.");
            return NextResponse.json({ error: "Configuración de servidor incompleta" }, { status: 500 });
        }

        // 2. CONFIGURAR HEADERS SEGÚN ESTÁNDAR EPAYCO
        const headers = {
            'public-key': publicKey,
            'private-key': privateKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // 3. CREAR CLIENTE EN EPAYCO
        const customerRes = await fetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                token_card: token,
                name: name,
                email: email,
                default: true
            })
        });

        const customer = await customerRes.json();
        if (!customer.success) {
            console.error("Error ePayco Cliente:", customer);
            throw new Error("ePayco Cliente: " + customer.message);
        }

        const customerId = customer.data.customerId;

        // 4. CREAR SUSCRIPCIÓN RECURRENTE
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "12345678", // Campo genérico para pruebas
                url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
                method_confirmation: "POST"
            })
        });

        const subscription = await subRes.json();
        if (!subscription.success) {
            console.error("Error ePayco Suscripción:", subscription);
            throw new Error("ePayco Suscripción: " + subscription.message);
        }

        // 5. ACTUALIZAR PERFIL EN SUPABASE
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
        console.error("FALLA TÉCNICA BACKEND:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}