// Skylog V2.0 — usuario de la sesión SIN llamar al servidor de Auth de Supabase.
// `getClaims()` verifica el JWT en local (clave pública, JWKS en caché) y entrega el mismo `sub`/`email`;
// `getUser()` hace un viaje de red al servicio de Auth en cada petición, y cuando ese servicio se atrasa (segundos)
// atrasa TODA la API (medido: `auth;dur=6328` dentro de `/api/duty/context`). Un token revocado se nota al vencer
// (≤ 1 h), igual que en el middleware; la base de datos sigue verificando el JWT en cada consulta (RLS).
// Para acciones destructivas o de plataforma (borrar cuenta, /admin) se sigue usando `getUser()`.
export async function getAuthUser(supabase) {
  const { data, error } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub) return null;
  return { id: c.sub, email: c.email || null, aal: c.aal || null, last_sign_in_at: null, created_at: null, user_metadata: c.user_metadata || {}, app_metadata: c.app_metadata || {} };
}
