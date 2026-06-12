import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// POST /api/notifications/read
// Body: { id } → marca una como leída · { all: true } → marca todas las no leídas
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (!body.all && !body.id) {
      return NextResponse.json({ error: 'Falta `id` o `all`.' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const base = supabase
      .from('notifications')
      .update({ read_at: nowIso })
      .eq('profile_id', user.id);

    const { error } = body.all
      ? await base.is('read_at', null)   // todas las no leídas
      : await base.eq('id', body.id);    // una específica
    if (error) throw error;

    // Recalcular no leídas para que la campana actualice el badge
    const { data: unread } = await supabase
      .from('notifications')
      .select('id')
      .eq('profile_id', user.id)
      .is('read_at', null);

    return NextResponse.json({ ok: true, unreadCount: (unread || []).length });
  } catch (err) {
    console.error('[notifications/read POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
