// Skylog V2.0 — Reportes: Equipo Tecnológico Asociado (ETA) — ficha con
// número RETA (RAC 100 Apéndice 1 §2.1). Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  const { data, error } = await supabase.from('eta_items').select('brand, model, reta_number, description').eq('organization_id', organizationId).order('brand');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data || [] });
}
