import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

export async function POST(request) {
  try {
    // Rate limiting: máx 10 intentos de login por IP por minuto (anti brute-force)
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' }, { status: 429 });
    }

    const { email, password } = await request.json();

    // Cliente SSR que SÍ guarda cookies
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({
      session: data.session,
      message: "Sesión iniciada correctamente"
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}