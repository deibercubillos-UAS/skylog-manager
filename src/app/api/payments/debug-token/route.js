import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        // En la API REST, este es el formato exacto para tokenizar
        const response = await epaycoRequest("/v1/tokenize-card", "POST", {
            number: body.number,
            exp_year: body.exp_year,
            exp_month: body.exp_month,
            cvc: body.cvc,
            hasCvv: true
        });

        console.log("Respuesta cruda ePayco:", response);
        return NextResponse.json(response);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
