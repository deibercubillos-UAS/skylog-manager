import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        // Truco para cargar librerías CommonJS en Next.js sin que se rompan
        const epaycoModule = require('epayco-sdk-node');
        const epaycoInit = typeof epaycoModule === 'function' ? epaycoModule : epaycoModule.default;

        const epayco = epaycoInit({
            apiKey: process.env.EPAYCO_PUBLIC_KEY,
            privateKey: process.env.EPAYCO_PRIVATE_KEY,
            lang: 'ES',
            test: true
        });

        const body = await request.json();

        // --- FORMATO EXACTO DEL MANUAL ---
        const credit_info = {
            "card[number]": body.number.replace(/\s/g, ''),
            "card[exp_year]": body.exp_year.toString(),
            "card[exp_month]": body.exp_month.toString().padStart(2, '0'),
            "card[cvc]": body.cvc.toString(),
            "hasCvv": true
        };

        console.log("Enviando info al SDK de ePayco...");

        // Usamos una Promesa para capturar la respuesta del SDK
        const token = await new Promise((resolve, reject) => {
            epayco.token.create(credit_info)
                .then(res => resolve(res))
                .catch(err => reject(err));
        });

        console.log("Respuesta del SDK:", token);

        // Si el token es exitoso, devolvemos el ID
        if (token.id || (token.data && token.data.id)) {
            return NextResponse.json({
                success: true,
                token_id: token.id || token.data.id,
                log: "Token creado satisfactoriamente",
                data_completa: token
            });
        }

        return NextResponse.json({ 
            success: false, 
            error: token.description || token.message || "Error en tokenización",
            sdk_res: token 
        }, { status: 400 });

    } catch (err) {
        console.error("Crash en API BitaFly:", err.message);
        return NextResponse.json({ error: "Fallo Servidor", detalle: err.message }, { status: 500 });
    }
}
