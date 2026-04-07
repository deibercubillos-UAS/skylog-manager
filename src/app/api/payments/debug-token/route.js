import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        // El endpoint oficial de tokenización para servidores es:
        const EPAYCO_TOKEN_URL = "https://api.secure.payco.co/v1/tokenize-card";
        
        // ePayco requiere estos datos exactos
        const cardData = {
            "number": body.number.replace(/\s/g, ''),
            "exp_year": body.exp_year.toString(),
            "exp_month": body.exp_month.toString().padStart(2, '0'),
            "cvc": body.cvc.toString(),
            "hasCvv": true
        };

        console.log("Enviando datos a ePayco Tokenizer...");

        const response = await fetch(EPAYCO_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // EN EL PASO 1 (TOKEN), ePayco usa la PUBLIC_KEY como Header
                "public_key": process.env.NEXT_PUBLIC_EPAYCO_P_KEY 
            },
            body: JSON.stringify(cardData)
        });

        const result = await response.json();

        // Si ePayco nos devuelve el ID, el éxito es total
        if (result.id || (result.data && result.data.id)) {
            const tokenId = result.id || result.data.id;
            console.log("✅ TOKEN GENERADO CON ÉXITO:", tokenId);
            return NextResponse.json({
                success: true,
                token_id: tokenId,
                respuesta: result
            });
        }

        // Si ePayco responde con error (ej: tarjeta inválida)
        return NextResponse.json({
            success: false,
            error: result.description || result.message || "Error en la tarjeta",
            debug: result
        }, { status: 400 });

    } catch (err) {
        console.error("Fallo técnico en servidor:", err.message);
        return NextResponse.json({ 
            error: "Fallo en servidor BitaFly", 
            detalle: err.message 
        }, { status: 500 });
    }
}
