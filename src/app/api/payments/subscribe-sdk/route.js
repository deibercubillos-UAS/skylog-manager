import epayco from '@/lib/epaycoServer';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // Validación de Variables de Entorno
        if (!process.env.EPAYCO_PUBLIC_KEY || !process.env.EPAYCO_PRIVATE_KEY) {
            return NextResponse.json({ error: "Servidor: Llaves API REST no configuradas en Vercel." }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Sesión expirada" }, { status: 401 });

        const body = await request.json();
        const { cardInfo, planId, customerInfo } = body;

        // PASO 1: Tokenización
        console.log("Iniciando Paso 1: Token...");
        const token = await epayco.token.create(cardInfo);
        if (!token.status && !token.success) {
            return NextResponse.json({ error: `ePayco Token Error: ${token.data?.description || token.message || "Datos de tarjeta inválidos"}` }, { status: 400 });
        }

        // PASO 2: Cliente
        console.log("Iniciando Paso 2: Cliente...");
        const customer = await epayco.customers.create({
            token_card: token.id || token.data?.id,
            name: customerInfo.name,
            last_name: customerInfo.lastName,
            email: user.email,
            default: true
        });
        
        if (!customer.status && !customer.success) {
            return NextResponse.json({ error: "ePayco Customer: " + (customer.message || "Falla al crear perfil de cliente") }, { status: 400 });
        }

        // PASO 3: Suscripción
        console.log("Iniciando Paso 3: Suscripción...");
        const subscription = await epayco.subscriptions.create({
            id_plan: planId,
            customer: customer.data?.customerId || customer.customerId,
            token_card: token.id || token.data?.id,
            doc_type: customerInfo.docType,
            doc_number: customerInfo.docNumber,
            url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
            method_confirmation: "POST"
        });

        if (subscription.status || subscription.success) {
            // Actualizar Supabase
            const planName = planId.includes('escuadrilla') ? 'escuadrilla' : 'flota';
            await supabase.from('profiles').update({
                subscription_plan: planName,
                epayco_customer_id: customer.data?.customerId || customer.customerId,
                epayco_subscription_id: subscription.data?.id || subscription.id,
                updated_at: new Date().toISOString()
            }).eq('id', user.id);

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "ePayco Sub: " + (subscription.message || "El plan no existe o fue rechazado") }, { status: 400 });
        }

    } catch (err) {
        console.error("CRITICAL API ERROR:", err);
        return NextResponse.json({ error: "Excepción de Servidor: " + err.message }, { status: 500 });
    }
}
