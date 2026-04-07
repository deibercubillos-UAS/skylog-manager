import epayco from '@/lib/epaycoServer';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

        const body = await request.json();
        const { cardInfo, planId, customerInfo } = body;

        // PASO 1: Crear Token de Tarjeta
        const token = await epayco.token.create(cardInfo);
        if (!token.success) throw new Error("Error en Tokenización: " + token.object);

        // PASO 2: Crear Cliente y vincular Token
        const customer = await epayco.customers.create({
            token_card: token.id,
            name: customerInfo.name,
            last_name: customerInfo.lastName,
            email: user.email,
            default: true
        });
        if (!customer.success) throw new Error("Error al crear cliente");

        // PASO 3: Crear Suscripción (El Plan ya debe existir en tu ePayco)
        const subscription = await epayco.subscriptions.create({
            id_plan: planId,
            customer: customer.data.customerId,
            token_card: token.id,
            doc_type: customerInfo.docType,
            doc_number: customerInfo.docNumber,
            url_confirmation: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/confirmation`,
            method_confirmation: "POST"
        });

        if (subscription.success) {
            // Actualizar perfil en Supabase
            await supabase.from('profiles').update({
                subscription_plan: planId.split('_')[1], // asumiendo id 'plan_escuadrilla_mensual'
                epayco_customer_id: customer.data.customerId,
                epayco_subscription_id: subscription.data.id
            }).eq('id', user.id);

            return NextResponse.json({ success: true, data: subscription.data });
        } else {
            throw new Error(subscription.message);
        }

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
