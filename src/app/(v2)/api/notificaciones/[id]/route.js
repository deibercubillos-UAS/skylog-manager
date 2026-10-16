// Skylog V2.0 — DELETE /api/notificaciones/[id] — descarta una notificación propia (la RLS impide tocar las ajenas).
import { createClientSSR } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/v2/authUser';

export async function DELETE(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
