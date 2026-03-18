// src/app/api/auth/register/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password, fullName } = await request.json();
    const emailLower = email.toLowerCase().trim();

    // Inicializamos Supabase en el servidor
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // 1. Lógica de Negocio: Verificar invitaciones
    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('email', emailLower)
      .eq('status', 'pending')
      .single();

    // 2. Ejecutar Registro en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: emailLower,
      password: password,
      options: { 
        data: { 
          full_name: fullName,
          is_invited: !!invitation // Marcamos si venía de una invitación
        } 
      }
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    // Nota: El Trigger de la base de datos que creamos antes 
    // se encargará automáticamente de crear la fila en 'profiles'.

    return NextResponse.json({ 
      user: authData.user, 
      session: authData.session,
      isInvited: !!invitation 
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: "Error crítico en el servidor de registro" }, { status: 500 });
  }
}