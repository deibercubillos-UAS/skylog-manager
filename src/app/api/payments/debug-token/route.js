import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        // Formato exacto que pide ePayco para el Paso 1
        const cardInfo = {
            "card[number]": body.number.replace(/\s/g, ''),
            "card[exp_year]": body.exp_year.toString(),
            "card[exp_month]": body.exp_month.toString().padStart(2, '0'),
            "card[cvc]": body.cvc.toString(),
            "hasCvv": "true"
        };

        console.log("Iniciando Tokenización modo SDK...");
        const result = await epaycoRequest(null, "POST", cardInfo, true);

        // Si ePayco nos devuelve el objeto con el ID, hemos tenido éxito
        if (result.id || (result.data && result.data.id)) {
            return NextResponse.json({
                success: true,
                token_id: result.id || result.data.id,
                respuesta_cruda: result
            });
        }

        return NextResponse.json({ 
            success: false, 
            error: result.description || result.message || "Error desconocido en ePayco",
            debug: result
        }, { status: 400 });

    } catch (err) {
        return NextResponse.json({ error: "Fallo en servidor BitaFly", detalle: err.message }, { status: 500 });
    }
}
