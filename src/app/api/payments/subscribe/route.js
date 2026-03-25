import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { token, planId, name, email, userId } = body;

        // 1. CARGAR TODAS LAS LLAVES (Sin espacios)
        const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY?.trim();
        const privateKey = process.env.EPAYCO_PRIVATE_KEY?.trim();
        const pKey = process.env.EPAYCO_P_KEY?.trim();
        const custId = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID?.trim();

        // 2. LOGIN PARA TOKEN DE SESIÓN
        const authRes = await fetch('https://api.secure.payco.co/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_key: publicKey, private_key: privateKey })
        });
        const authData = await authRes.json();
        const bearerToken = authData.token || authData.data?.token;

        const secureHeaders = {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        };

        // 3. CREAR CLIENTE (Aquí es donde ePayco usa el P_CUST_ID internamente)
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

        // 4. CREAR SUSCRIPCIÓN RECURRENTE
        // Al incluir el customerId y el planId, ePayco debería reflejarlo en tu panel
        const subRes = await fetch('https://api.secure.payco.co/recurring/v1/subscription/create', {
            method: 'POST',
            headers: secureHeaders,
            body: JSON.stringify({
                id_plan: planId,
                customer: customerId,
                token_card: token,
                doc_type: "CC",
                doc_number: "1010101010",
                // Enviamos datos extra para asegurar vinculación
                address: "Calle 123",
                phone: "3000000000"
            })
        });
        const subscription = await subRes.json();
        
        if (!subscription.success) {
            console.error("Error ePayco Sub:", subscription);
            throw new Error("ePayco Suscripción: " + subscription.message);
        }

        // 5. ACTUALIZAR SUPABASE
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
        console.error("DETALLE ERROR BACKEND:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}