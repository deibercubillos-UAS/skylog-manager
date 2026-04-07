import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;

        if (!P_KEY) {
            return NextResponse.json({ error: "Falta NEXT_PUBLIC_EPAYCO_P_KEY en Vercel" }, { status: 500 });
        }

        // --- FORMATO DE DATOS DE FORMULARIO (Requerido por ePayco para card[number]) ---
        const params = new URLSearchParams();
        params.append("card[number]", body.number.replace(/\s/g, ''));
        params.append("card[exp_year]", body.exp_year.toString());
        params.append("card[exp_month]", body.exp_month.toString().padStart(2, '0'));
        params.append("card[cvc]", body.cvc.toString());
        params.append("hasCvv", "true");

        console.log("Enviando Form-Data a ePayco...");

        const response = await fetch("https://api.secure.payco.co/v1/tokenize-card", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "public_key": P_KEY
            },
            body: params.toString()
        });

        const textRes = await response.text();
        
        // Intentamos parsear la respuesta solo si parece JSON
        try {
            const jsonRes = JSON.parse(textRes);
            
            if (jsonRes.id || (jsonRes.data && jsonRes.data.id)) {
                const tokenId = jsonRes.id || jsonRes.data.id;
                return NextResponse.json({
                    success: true,
                    token_id: tokenId,
                    respuesta: jsonRes
                });
            }

            return NextResponse.json({
                success: false,
                error: jsonRes.description || jsonRes.message || "Error en validación",
                debug: jsonRes
            }, { status: 400 });

        } catch (e) {
            // Si no es JSON, capturamos el error HTML para diagnosticar
            console.error("ePayco devolvió HTML:", textRes.slice(0, 200));
            return NextResponse.json({
                error: "ePayco devolvió un error de servidor (HTML)",
                status: response.status,
                vistazo: textRes.slice(0, 150)
            }, { status: 500 });
        }

    } catch (err) {
        return NextResponse.json({ error: "Fallo Servidor BitaFly", detalle: err.message }, { status: 500 });
    }
}
