import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { cancelSubscription } from '@/lib/epayco';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Leer el epayco_subscription_id del perfil antes de cancelar
    const { data: profile } = await supabase
      .from('profiles')
      .select('epayco_subscription_id')
      .eq('id', user.id)
      .single();

    // Cancelar en ePayco si existe suscripción activa
    if (profile?.epayco_subscription_id) {
      try {
        await cancelSubscription(profile.epayco_subscription_id);
      } catch (epaycoErr) {
        // Log pero no bloquea — el perfil igual se degrada a piloto
        console.error('Error cancelando en ePayco:', epaycoErr.message);
      }
    }

    // Degradar a plan piloto en Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan:       'piloto',
        epayco_subscription_id:  null,
        epayco_ref:              null,
        subscription_expires_at: null,
        updated_at:              new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
