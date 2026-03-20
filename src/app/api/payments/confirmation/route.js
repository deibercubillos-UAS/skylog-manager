import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    // ePayco envía los datos del pago aquí
    const { x_response, x_amount, x_extra1, x_id_invoice } = body;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    if (x_response === 'Aceptada') {
       // 1. Identificar al usuario (podemos pasar el userId en extra1 de ePayco)
       // 2. Actualizar el plan en profiles
       // 3. Registrar el log de pago
    }

    return NextResponse.json({ message: "Recibido" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}