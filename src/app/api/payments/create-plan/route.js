import { epaycoRequest } from '@/lib/epaycoServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        // Endpoint oficial para planes: /recurring/v1/plan/create
        const res = await epaycoRequest("/recurring/v1/plan/create", "POST", body);
        return NextResponse.json(res);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
