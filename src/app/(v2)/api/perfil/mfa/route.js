// Skylog V2.0 — bandera del segundo factor del propio usuario. El perfil llama aquí tras activar (true) o desactivar
// (false) su TOTP (la mecánica real la hace Supabase Auth en el cliente). La bandera `accounts.mfa_enabled` es solo la
// optimización de latencia que lee el contexto de sesión; esto la mantiene al día. Solo afecta a la cuenta propia.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/v2/authUser';

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.enabled !== 'boolean') return Response.json({ error: 'enabled (boolean) es requerido' }, { status: 400 });

  // Campo explícito, solo la cuenta del propio usuario (por auth_user_id del token verificado).
  const admin = createAdminClient();
  const { error } = await admin.from('accounts').update({ mfa_enabled: body.enabled }).eq('auth_user_id', user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, enabled: body.enabled });
}
