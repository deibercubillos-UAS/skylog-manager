import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function POST(request) {
  try {
    // Rate limiting: máx 3 solicitudes de reset por IP por hora (previene email flooding)
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`reset:${ip}`, { limit: 3, windowMs: 3_600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiadas solicitudes de recuperación. Intenta más tarde.' }, { status: 429 });
    }

    const { email } = await request.json();
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com'}/update-password`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ message: "Correo de recuperación enviado" });
  } catch (err) {
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}