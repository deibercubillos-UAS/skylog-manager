// Skylog V2.0 — GET /api/notificaciones?organizationId=&limit= — las notificaciones de la persona en esa organización
// (más recientes primero) y cuántas no ha leído. La RLS de la tabla ya limita a las propias; el filtro por organización
// es para que la campana siga a la organización activa.
import { createClientSSR } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30', 10) || 30, 1), 100);

  const [{ data, error }, { count }] = await Promise.all([
    supabase.from('notifications').select('id, type, title, body, link, read_at, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(limit),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('read_at', null),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ notifications: data || [], unreadCount: count || 0 });
}
