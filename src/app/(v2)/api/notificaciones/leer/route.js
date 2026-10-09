// Skylog V2.0 — POST /api/notificaciones/leer — { id } marca una como leída; { all: true, organizationId } marca todas
// las de esa organización. Solo toca `read_at` (el permiso de columna de la base no deja cambiar nada más).
import { createClientSSR } from '@/lib/supabaseServer';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { id, all, organizationId } = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  let query = supabase.from('notifications').update({ read_at: now }).is('read_at', null);
  if (all) {
    if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
    query = query.eq('organization_id', organizationId);
  } else if (id) query = query.eq('id', id);
  else return Response.json({ error: 'id o all son requeridos' }, { status: 400 });

  const { error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
