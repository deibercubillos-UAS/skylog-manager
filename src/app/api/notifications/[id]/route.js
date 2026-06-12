import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// DELETE /api/notifications/[id] — descarta (elimina) una notificación propia
export async function DELETE(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', params.id)
      .eq('profile_id', user.id); // RLS + filtro explícito
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[notifications/[id] DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
