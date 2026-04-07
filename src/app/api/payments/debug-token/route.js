import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const PUB_KEY = process.env.EPAYCO_PUBLIC_KEY?.trim();
        const PRIV_KEY = process.env.EPAYCO_PRIVATE_KEY?.trim();

        if (!PUB_KEY || !PRIV_KEY) {
            return NextResponse.json({ error: "Llaves API REST no configuradas en Vercel" }, { status: 500 });
        }

        // --- SUB-PASO A: LOGIN PARA OBTENER JWT ---
        console.log("Obteniendo acceso a ePayco...");
        const authRes = await fetch("https://api.secure.payco.co/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_key: PUB_KEY, private_key: PRIV_KEY })
        });

        if (!authRes.ok) {
            const authErr = await authRes.text();
            throw new Error(`Error en Login ePayco: ${authRes.status} - ${authErr}`);
        }

        const authData = await authRes.json();
        const bearerToken = authData.bearer_token || authData.token;

        // --- SUB-PASO B: TOKENIZACIÓN (Endpoint REST Correcto) ---
        // En la API REST oficial, no se usan corchetes, se usan llaves planas
        const cardData = {
            "number": body.number.replace(/\s/g, ''),
            "exp_year": body.exp_year.toString(),
            "exp_month": body.exp_month.toString().padStart(2, '0'),
            "cvc": body.cvc.toString(),
            "hasCvv": true
        };

        console.log("Tokenizando tarjeta en endpoint REST...");
        const response = await fetch("https://api.secure.payco.co/v1/token/card", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${bearerToken}`,
                "Content-Type": "application/json",
                "type": "sdk-jwt"
            },
            body: JSON.stringify(cardData)
        });

        const result = await response.json();

        // Verificamos si ePayco devolvió el ID del token
        if (result.id || (result.data && result.data.id)) {
            const tokenId = result.id || result.data.id;
            console.log("🚀 TOKEN GENERADO:", tokenId);
            return NextResponse.json({
                success: true,
                token_id: tokenId,
                respuesta: result
            });
        }

        // Si falló pero devolvió JSON, lo mostramos
        return NextResponse.json({
            success: false,
            error: result.description || result.message || "ePayco rechazó la tarjeta",
            debug: result
        }, { status: 400 });

    } catch (err) {
        console.error("Fallo técnico:", err.message);
        return NextResponse.json({ 
            error: "Fallo en servidor BitaFly", 
            detalle: err.message 
        }, { status: 500 });
    }
}
