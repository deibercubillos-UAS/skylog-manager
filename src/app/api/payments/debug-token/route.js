import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        
        const res = await epaycoRequest("/v1/tokenize-card", "POST", {
            number: body.number,
            exp_year: body.exp_year,
            exp_month: body.exp_month,
            cvc: body.cvc,
            hasCvv: true
        });

        if (res.error) {
            return NextResponse.json({ 
                error: `Fallo en ${res.step}`, 
                status: res.status, 
                detalle: res.msg 
            }, { status: 400 });
        }

        return NextResponse.json(res.data);
    } catch (err) {
        return NextResponse.json({ error: "Excepción Servidor", msg: err.message }, { status: 500 });
    }
}
