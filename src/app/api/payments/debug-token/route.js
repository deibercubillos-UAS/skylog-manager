import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        // --- FORMATO EXACTO SOLICITADO ---
        const infoParaEpayco = {
            "card[number]": body.number.replace(/\s/g, ''),
            "card[exp_year]": body.exp_year.toString(),
            "card[exp_month]": body.exp_month.toString().padStart(2, '0'),
            "card[cvc]": body.cvc.toString(),
            "hasCvv": true
        };

        console.log("Enviando a ePayco con llaves literales:", infoParaEpayco);

        // Probamos el endpoint que suele usar el SDK
        const result = await epaycoRequest("/v1/tokenize-card", "POST", infoParaEpayco);

        // Si el anterior falla (devuelve error o no tiene id), probamos la variante con diagonal
        if (!result.id && !result.data?.id) {
            console.log("Variante 1 falló, probando /v1/tokenize/card...");
            const resultAlt = await epaycoRequest("/v1/tokenize/card", "POST", infoParaEpayco);
            return NextResponse.json(resultAlt);
        }

        return NextResponse.json(result);
    } catch (err) {
        return NextResponse.json({ error: "Crash Servidor", detalle: err.message }, { status: 500 });
    }
}
