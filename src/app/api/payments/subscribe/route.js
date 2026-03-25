import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();

        // 1. AUTH EPAYCO
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        });
        const authData = await authRes.json();
        const bearerToken = authData.token || authData.data?.token;

        const headers = { 'Authorization': `Bearer ${bearerToken}`, 'Content-Type': 'application/json' };

        // 2. CREAR CLIENTE
        const custRes = await fetch('https://api.secure.payco.co/payment/v1/customer/create', {
            method: 'POST', headers,
            body: JSON.stringify({ token_card: token, name, email, default: true })
        });
        const customer = await custRes.json();
        if (!customer.success) throw new Error("Cliente: " + customer.message);

        // 3. CREAR SUSCRIPCIÓN (ACTIVACIÓN)
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST', headers,
            body: JSON.stringify({
                id_plan: planId,
                customer: customer.data.customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "1010101010",
                url_confirmation: `https://bitafly.com/api/payments/confirmation`,
                method_confirmation: "POST"
            })
        });
        const subscription = await subRes.json();
        
        if (!subscription.success) throw new Error("Suscripción: " + subscription.message);

        // 4. ACTUALIZAR SUPABASE (ADMIN ROLE)
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const planKey = planId.toLowerCase().includes('escuadrilla') ? 'escuadrilla' : 'flota';

        await supabaseAdmin.from('profiles').update({ 
            subscription_plan: planKey,
            epayco_customer_id: customer.data.customerId,
            epayco_subscription_id: subscription.data.id,
            updated_at: new Date().toISOString()
        }).eq('id', userId);

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error("FALLA:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}