import epayco from '@/lib/epaycoServer';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        if (!epayco) {
            return NextResponse.json({ error: "Error de inicialización del SDK de ePayco en el servidor." }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });

        const body = await request.json();
        const { cardInfo, planId, customerInfo } = body;

        // PASO 1: Tokenización
        // El SDK usa callbacks internos a veces, lo envolvemos en una promesa pura
        const token = await epayco.token.create(cardInfo);
        
        if (!token || (!token.success && !token.status)) {
            const errorMsg = token?.data?.description || token?.message || "Datos de tarjeta rechazados";
            return NextResponse.json({ error: `Tarjeta: ${errorMsg}` }, { status: 400 });
        }

        // PASO 2: Cliente
        const customer = await epayco.customers.create({
            token_card: token.id || (token.data && token.data.id),
            name: customerInfo.name,
            last_name: customerInfo.lastName,
            email: user.email,
            default: true
        });

        if (!customer || (!customer.success && !customer.status)) {
            return NextResponse.json({ error: "Error creando perfil de cliente en ePayco" }, { status: 400 });
        }

        // PASO 3: Suscripción
        const subData = {
            id_plan: planId,
            customer: customer.data?.customerId || customer.customerId,
            token_card: token.id || (token.data && token.data.id),
            doc_type: customerInfo.docType,
            doc_number: customerInfo.docNumber,
            url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
            method_confirmation: "POST"
        };

        const subscription = await epayco.subscriptions.create(subData);

        if (subscription && (subscription.success || subscription.status)) {
            const planSlug = planId.includes('escuadrilla') ? 'escuadrilla' : 'flota';
            
            await supabase.from('profiles').update({
                subscription_plan: planSlug,
                epayco_customer_id: customer.data?.customerId || customer.customerId,
                epayco_subscription_id: subscription.data?.id || subscription.id,
                updated_at: new Date().toISOString()
            }).eq('id', user.id);

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: subscription?.message || "El plan no pudo ser activado" }, { status: 400 });
        }

    } catch (err) {
        console.error("PAYMENT_ROUTE_ERROR:", err);
        return NextResponse.json({ error: "Fallo técnico: " + err.message }, { status: 500 });
    }
}
