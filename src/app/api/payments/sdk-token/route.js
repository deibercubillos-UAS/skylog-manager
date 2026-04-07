import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const PUBLIC_KEY = process.env.EPAYCO_PUBLIC_KEY;

        if (!PUBLIC_KEY) {
            return NextResponse.json({ error: "Falta EPAYCO_PUBLIC_KEY en Vercel" }, { status: 500 });
        }

        // --- DATOS ESTÁTICOS SOLICITADOS (Manual ePayco) ---
        const credit_info = {
            "card[number]": "4575623182290326",
            "card[exp_year]": "2027",
            "card[exp_month]": "12",
            "card[cvc]": "123",
            "hasCvv": true
        };

        console.log("Iniciando Tokenización Estática...");

        // Llamada directa a la API de ePayco (lo que el SDK hace internamente)
        const response = await fetch("https://api.secure.payco.co/v1/tokenize-card", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "public_key": PUBLIC_KEY
            },
            body: JSON.stringify(credit_info)
        });

        const result = await response.json();

        // El SDK devuelve el objeto directamente. Nosotros lo envolvemos para la UI.
        if (result.id || (result.data && result.data.id)) {
            const tokenId = result.id || result.data.id;
            return NextResponse.json({
                success: true,
                token_id: tokenId,
                sdk_response: result
            });
        }

        return NextResponse.json({ 
            success: false, 
            error: result.description || result.message || "ePayco rechazó los datos",
            sdk_response: result
        }, { status: 400 });

    } catch (err) {
        console.error("Error Crítico:", err.message);
        return NextResponse.json({ 
            success: false, 
            error: "Fallo técnico en servidor", 
            detalle: err.message 
        }, { status: 500 });
    }
}
