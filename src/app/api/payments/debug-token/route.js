import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        // El formato de corchetes que me indicaste
        const cardData = {
            "card[number]": body.number.replace(/\s/g, ''),
            "card[exp_year]": body.exp_year.toString(),
            "card[exp_month]": body.exp_month.toString().padStart(2, '0'),
            "card[cvc]": body.cvc.toString(),
            "hasCvv": true
        };

        // Ruta estándar que usa el SDK internamente
        const res = await epaycoRequest("/v1/tokenize-card", "POST", cardData);

        if (res.error) {
            return NextResponse.json({ 
                error: `Error en ${res.step}`, 
                status: res.status, 
                mensaje: res.msg 
            }, { status: 400 });
        }

        return NextResponse.json(res.data);
    } catch (err) {
        return NextResponse.json({ error: "Excepción en Servidor BitaFly", detalle: err.message }, { status: 500 });
    }
}
