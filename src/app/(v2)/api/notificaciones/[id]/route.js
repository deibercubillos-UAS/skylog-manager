// Skylog V2.0 — DELETE /api/notificaciones/[id] — descarta una notificación propia (la RLS impide tocar las ajenas).
import { createClientSSR } from '@/lib/supabaseServer';

export async function DELETE(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
