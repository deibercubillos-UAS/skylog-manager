import { epaycoRequest } from '@/lib/epaycoServer';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await request.json();
        const { cardInfo, planId, customerInfo } = body;

        // --- PASO 1: TOKENIZACIÓN ---
        // Usamos las llaves exactas que pide la API REST de ePayco
        const tokenRes = await epaycoRequest("/v1/tokenize-card", "POST", {
            number: cardInfo.number,
            exp_year: cardInfo.exp_year,
            exp_month: cardInfo.exp_month,
            cvc: cardInfo.cvc,
            hasCvv: true
        });

        if (tokenRes.error_html) throw new Error(`ePayco rechazo Tokenización (Error ${tokenRes.status})`);
        if (!tokenRes.id && !tokenRes.data?.id) throw new Error(tokenRes.description || "Tarjeta rechazada");

        const tokenId = tokenRes.id || tokenRes.data.id;

        // --- PASO 2: CLIENTE ---
        const customerRes = await epaycoRequest("/payment/v1/customer/create", "POST", {
            token_card: tokenId,
            name: customerInfo.name,
            last_name: customerInfo.lastName,
            email: user.email,
            default: true
        });
        
        const customerId = customerRes.data?.customerId || customerRes.customerId;
        if (!customerId) throw new Error("No se pudo crear perfil de cliente");

        // --- PASO 3: SUSCRIPCIÓN ---
        const subRes = await epaycoRequest("/recurring/v1/subscription/create", "POST", {
            id_plan: planId,
            customer: customerId,
            token_card: tokenId,
            doc_type: customerInfo.docType,
            doc_number: customerInfo.docNumber,
            url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
            method_confirmation: "POST"
        });

        if (subRes.success || subRes.status === "active") {
            const planSlug = planId.includes('escuadrilla') ? 'escuadrilla' : 'flota';
            await supabase.from('profiles').update({
                subscription_plan: planSlug,
                epayco_customer_id: customerId,
                epayco_subscription_id: subRes.data?.id || subRes.id,
                updated_at: new Date().toISOString()
            }).eq('id', user.id);

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: subRes.message || "Error en plan" }, { status: 400 });
        }

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
