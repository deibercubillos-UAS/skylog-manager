import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Importación compatible con Vercel
        const epaycoNode = require('epayco-sdk-node');
        const epaycoInit = typeof epaycoNode === 'function' ? epaycoNode : epaycoNode.default;

        const epayco = epaycoInit({
            apiKey: process.env.EPAYCO_PUBLIC_KEY,
            privateKey: process.env.EPAYCO_PRIVATE_KEY,
            lang: 'ES',
            test: true
        });

        // --- DATOS ESTÁTICOS SOLICITADOS ---
        const credit_info = {
            "card[number]": "4575623182290326",
            "card[exp_year]": "2027",
            "card[exp_month]": "12",
            "card[cvc]": "123",
            "hasCvv": true
        };

        console.log("Iniciando creación de token estático...");

        // Envolvemos el callback del SDK en una Promesa
        const result = await new Promise((resolve, reject) => {
            epayco.token.create(credit_info)
                .then(token => resolve(token))
                .catch(err => reject(err));
        });

        return NextResponse.json({
            status: "Procesado",
            token_id: result.id || (result.data && result.data.id) || "NO_GENERADO",
            respuesta_completa: result
        });

    } catch (err) {
        return NextResponse.json({ error: "Fallo en ejecución", detalle: err.message }, { status: 500 });
    }
}
