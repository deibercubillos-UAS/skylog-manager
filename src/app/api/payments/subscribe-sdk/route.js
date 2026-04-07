import { epaycoRequest } from '@/lib/epaycoServer';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });

        const body = await request.json();
        const { cardInfo, planId, customerInfo } = body;

        // PASO 1: Tokenizar Tarjeta
        const tokenRes = await epaycoRequest(null, "POST", cardInfo, true);
        if (!tokenRes.success && !tokenRes.status) {
            return NextResponse.json({ error: "Error de Tarjeta: " + (tokenRes.message || "Datos inválidos") }, { status: 400 });
        }
        const tokenId = tokenRes.id || tokenRes.data.id;

        // PASO 2: Crear/Vincular Cliente
        const customerRes = await epaycoRequest("/payment/v1/customer/create", "POST", {
            token_card: tokenId,
            name: customerInfo.name,
            last_name: customerInfo.lastName,
            email: user.email,
            default: true
        });
        const customerId = customerRes.data?.customerId || customerRes.customerId;

        // PASO 3: Crear Suscripción
        const subRes = await epaycoRequest("/recurring/v1/subscription/create", "POST", {
            id_plan: planId,
            customer: customerId,
            token_card: tokenId,
            doc_type: customerInfo.docType,
            doc_number: customerInfo.docNumber,
            url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
            method_confirmation: "POST"
        });

        if (subRes.success || subRes.status) {
            const planSlug = planId.includes('escuadrilla') ? 'escuadrilla' : 'flota';
            await supabase.from('profiles').update({
                subscription_plan: planSlug,
                epayco_customer_id: customerId,
                epayco_subscription_id: subRes.data?.id || subRes.id,
                updated_at: new Date().toISOString()
            }).eq('id', user.id);

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Suscripción: " + subRes.message }, { status: 400 });
        }

    } catch (err) {
        return NextResponse.json({ error: "Fallo en Servidor: " + err.message }, { status: 500 });
    }
}
