// Skylog V2.0 — registro del token de dispositivo para push nativo (FCM).
// La app móvil, al conceder permiso de notificaciones, obtiene un token de Firebase y lo
// envía aquí. POST lo guarda/renueva; DELETE lo borra (al cerrar sesión o revocar permiso).
// Autenticado: cada quien gestiona solo sus propios tokens (la RLS de push_tokens lo exige).
import { createClientSSR } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/v2/authUser';
import { resolveCurrentPerson } from '@/lib/v2/duty';

const PLATFORMS = ['android', 'ios', 'web'];

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const platform = PLATFORMS.includes(body?.platform) ? body.platform : 'android';
  if (!token || token.length > 4096) return Response.json({ error: 'Token inválido' }, { status: 400 });

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError || !personId) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { person_id: personId, token, platform, organization_id: organizationIds?.[0] || null, updated_at: new Date().toISOString() },
      { onConflict: 'person_id,token' },
    );
  if (error) return Response.json({ error: 'No se pudo guardar el token' }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!token) return Response.json({ error: 'Token inválido' }, { status: 400 });

  const { error } = await supabase.from('push_tokens').delete().eq('token', token);
  if (error) return Response.json({ error: 'No se pudo borrar el token' }, { status: 500 });
  return Response.json({ ok: true });
}
