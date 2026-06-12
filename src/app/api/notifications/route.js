import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// GET /api/notifications[?limit=30]
// Lista las notificaciones del usuario (más recientes primero) + contador de no leídas.
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { user } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const limit = Math.min(
      parseInt(new URL(request.url).searchParams.get('limit') || '30', 10) || 30,
      100,
    );

    // Lista (RLS ya restringe a profile_id = auth.uid(); el filtro explícito es defensa en profundidad)
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id,type,title,body,link,metadata,read_at,created_at,actor_id')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    // Conteo de no leídas — select('id') + length (respeta RLS + filtro explícito)
    const { data: unread } = await supabase
      .from('notifications')
      .select('id')
      .eq('profile_id', user.id)
      .is('read_at', null);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: (unread || []).length,
    });
  } catch (err) {
    console.error('[notifications GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
