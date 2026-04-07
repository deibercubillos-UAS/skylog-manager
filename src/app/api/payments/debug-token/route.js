import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        // Limpieza y formateo estricto
        const cardData = {
            number: body.number.replace(/\s/g, ''),
            exp_year: body.exp_year.toString(),
            exp_month: body.exp_month.toString().padStart(2, '0'), // "8" -> "08"
            cvc: body.cvc.toString(),
            hasCvv: true
        };

        console.log("Intentando tokenizar en /v1/tokenize/card...");
        
        // CAMBIO CLAVE: Ruta con diagonal en lugar de guion
        const res = await epaycoRequest("/v1/tokenize/card", "POST", cardData);

        if (res.error) {
            // Si falla la primera, intentamos la ruta alternativa /v1/token/card
            console.log("Ruta 1 falló, intentando ruta alternativa...");
            const resAlt = await epaycoRequest("/v1/token/card", "POST", cardData);
            
            if (resAlt.error) {
                return NextResponse.json({ 
                    error: "Ambos endpoints (tokenize/card y token/card) fallaron con 404.",
                    status: resAlt.status,
                    detalle: resAlt.msg
                }, { status: 400 });
            }
            return NextResponse.json(resAlt.data);
        }

        return NextResponse.json(res.data);
    } catch (err) {
        return NextResponse.json({ error: "Excepción Servidor", msg: err.message }, { status: 500 });
    }
}
