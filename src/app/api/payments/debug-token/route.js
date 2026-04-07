import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        const cardData = {
            number: body.number.replace(/\s/g, ''),
            exp_year: body.exp_year.toString(),
            exp_month: body.exp_month.toString().padStart(2, '0'),
            cvc: body.cvc.toString(),
            hasCvv: true
        };

        // LISTA DE POSIBLES ENDPOINTS SEGÚN DOCUMENTACIÓN
        const endpoints = [
            "/v1/token/card",
            "/token/card",
            "/v1/tokenize/card"
        ];

        let lastResult = null;

        for (const url of endpoints) {
            console.log(`Probando ruta: ${url}`);
            const res = await epaycoRequest(url, "POST", cardData);
            
            if (!res.error) {
                console.log(`✅ ¡ÉXITO! La ruta correcta es: ${url}`);
                return NextResponse.json({
                    ruta_exitosa: url,
                    token_id: res.data.id || res.data.data?.id,
                    respuesta: res.data
                });
            }
            lastResult = res;
        }

        // Si llegamos aquí, todas fallaron
        return NextResponse.json({ 
            error: "Ninguna ruta de tokenización funcionó (404 en todas).",
            intentos: endpoints,
            ultimo_detalle: lastResult.msg,
            ultimo_status: lastResult.status
        }, { status: 400 });

    } catch (err) {
        return NextResponse.json({ error: "Error fatal en servidor", detalle: err.message }, { status: 500 });
    }
}
