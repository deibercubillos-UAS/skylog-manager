// src/app/api/auth/login/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Backend: Inicializamos Supabase con la Service Role Key (opcional) o Anon
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Lógica de negocio: Validar credenciales
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // El backend responde con el éxito
    return NextResponse.json({ 
      user: data.user, 
      session: data.session,
      message: "Autenticación exitosa" 
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}