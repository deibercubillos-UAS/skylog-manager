import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        if (!token || !planId || !userId) {
            return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
        }

        // 1. AUTENTICACIÓN CON EPAYCO (Obtener Token de Sesión)
        // Usamos Basic Auth con tus llaves para identificarnos ante ePayco
        const authKey = Buffer.from(`${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}:${process.env.EPAYCO_PRIVATE_KEY}`).toString('base64');
        
        // 2. CREAR CLIENTE EN EPAYCO
        const customerRes = await fetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token_card: token,
                name: name,
                email: email,
                default: true
            })
        });

        const customer = await customerRes.json();
        if (!customer.success) throw new Error("Error ePayco Cliente: " + customer.message);

        const customerId = customer.data.customerId;

        // 3. CREAR SUSCRIPCIÓN RECURRENTE
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authKey}`,
                'Content-Type': 'application/json'
            },
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
        if (!subscription.success) throw new Error("Error ePayco Suscripción: " + subscription.message);

        // 4. ACTUALIZAR PERFIL EN SUPABASE
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
        console.error("FALLA TÉCNICA BACKEND:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}