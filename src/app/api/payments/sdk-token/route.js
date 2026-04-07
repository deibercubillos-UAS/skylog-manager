import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // --- CARGA SEGURA DEL SDK (Solución al error 't is not a function') ---
        const epaycoModule = require('epayco-sdk-node');
        const epaycoInit = typeof epaycoModule === 'function' ? epaycoModule : epaycoModule.default;

        // --- CONFIGURACIÓN SEGÚN MANUAL ---
        const epayco = epaycoInit({
            apiKey: process.env.EPAYCO_PUBLIC_KEY,
            privateKey: process.env.EPAYCO_PRIVATE_KEY,
            lang: 'ES',
            test: true
        });

        // --- DATOS ESTÁTICOS DEL MANUAL ---
        const credit_info = {
            "card[number]": "4575623182290326",
            "card[exp_year]": "2025",
            "card[exp_month]": "12",
            "card[cvc]": "123",
            "hasCvv": true
        };

        // --- CREACIÓN DEL TOKEN (Prometificada para Next.js) ---
        const token = await new Promise((resolve, reject) => {
            epayco.token.create(credit_info)
                .then(res => resolve(res))
                .catch(err => reject(err));
        });

        console.log("Token generado satisfactoriamente:", token);

        return NextResponse.json({
            success: true,
            token_id: token.id || (token.data && token.data.id) || "ERROR_NO_ID",
            sdk_response: token
        });

    } catch (err) {
        console.error("Error en SDK:", err.message);
        return NextResponse.json({ 
            success: false, 
            error: "Fallo en el servidor", 
            detalle: err.message 
        }, { status: 500 });
    }
}
