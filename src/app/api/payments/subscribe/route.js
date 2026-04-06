import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
        const privateKey = process.env.EPAYCO_PRIVATE_KEY;

        // 1. LOGIN EPAYCO (Obtener Bearer Token - PDF Pág. 9)
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        });
        const authData = await authRes.json();
        const bearerToken = authData.bearer_token || authData.token;

        const secureHeaders = { 
            'Authorization': `Bearer ${bearerToken}`, 
            'Content-Type': 'application/json',
            'type': 'sdk-jwt' // Requerido según Postman
        };

        // 2. CREAR CLIENTE (PDF Pág. 16)
        const customerRes = await fetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({ token_card: token, name, email, default: true })
        });
        const customer = await customerRes.json();
        if (!customer.success) throw new Error(customer.message);
        const customerId = customer.data.customerId;

        // 3. CREAR SUSCRIPCIÓN (PDF Pág. 31)
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
        if (!subscription.success) throw new Error(subscription.message);

        // 4. ACTUALIZAR SUPABASE
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        await supabaseAdmin.from('profiles').update({ 
            subscription_plan: planKey,
            epayco_customer_id: customerId,
            epayco_subscription_id: subscription.data.id,
            updated_at: new Date().toISOString()
        }).eq('id', userId);

        return NextResponse.json({ success: true });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}