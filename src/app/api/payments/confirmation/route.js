import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const data = Object.fromEntries(formData.entries());

        const status = String(data.x_cod_response); 
        const userId = data.x_extra2; 
        const planSolicitado = data.x_extra1;
        const subscriptionId = data.x_id_invoice; // ID CRÍTICO PARA PODER CANCELAR LUEGO

        if (status === "1") {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            await supabaseAdmin.from('profiles').update({ 
                subscription_plan: planSolicitado,
                epayco_subscription_id: subscriptionId, // GUARDADO EN DB
                updated_at: new Date().toISOString()
            }).eq('id', userId);
        }

        return NextResponse.json({ message: "OK" });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}