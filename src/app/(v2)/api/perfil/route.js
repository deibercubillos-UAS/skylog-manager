// Skylog V2.0 — Mi Perfil. Lee los datos propios de `people` de la persona
// autenticada. La escritura reutiliza `/api/flota/roster/[personId]`
// (ya soporta autoservicio: `isSelf = callerId === personId`) — no se
// duplica un endpoint de edición nuevo para lo mismo.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export async function GET() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ person: null });

  const { data, error } = await supabase.from('people').select('*').eq('id', personId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ person: data, lastSignInAt: user.last_sign_in_at || null, authEmail: user.email });
}
