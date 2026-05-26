import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = await createClient();

    // Obtener usuario del token — no confiar en el body para la identidad
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Cancelar la suscripción del usuario autenticado (RLS garantiza que no hay IDOR)
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan: 'piloto',
        wompi_subscription_ref: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
