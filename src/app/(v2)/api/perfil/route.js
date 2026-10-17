// Skylog V2.0 — Mi Perfil. Lee los datos propios de `people` de la persona
// autenticada. La escritura reutiliza `/api/flota/roster/[personId]`
// (ya soporta autoservicio: `isSelf = callerId === personId`) — no se
// duplica un endpoint de edición nuevo para lo mismo.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getAuthUser } from '@/lib/v2/authUser';

export async function GET() {
  const supabase = await createClientSSR();
  // Verificación local del JWT (sin viaje al servicio de Auth: era lo que atrasaba /perfil hasta 15 s).
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ person: null });

  const { data, error } = await supabase.from('people').select('*').eq('id', personId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Último acceso: viene en la sesión guardada en la cookie, no hace falta preguntar a Auth.
  const { data: sess } = await supabase.auth.getSession();
  return Response.json({ person: data, lastSignInAt: sess?.session?.user?.last_sign_in_at || null, authEmail: user.email });
}
