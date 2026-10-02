// Skylog V2.0 — F2 Comando y Control. Lectura de sesiones C2 para el
// panel "Dron en línea" del Centro de Control. Solo lee — la escritura es
// exclusiva de c2-gateway vía service role (ver c2-gateway/src/index.js,
// nunca desde el navegador). RLS de `c2_sessions`/`c2_telemetry` ya acota a
// miembros de la organización; este endpoint solo agrega la última muestra
// de telemetría por sesión (join manual, N pequeño — C2 "no es broadcast",
// 1-3 drones simultáneos por organización, ver 42-comando-control.md §4.11).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ sessions: [] });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId || !organizationIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  const { data: sessions, error } = await supabase
    .from('c2_sessions')
    .select('*, aircraft:aircraft_id(serial_number, model:model_id(brand, model))')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false })
    .limit(20);
  if (error) return Response.json({ error: 'Error consultando sesiones C2' }, { status: 500 });

  const withTelemetry = await Promise.all(
    (sessions || []).map(async (s) => {
      if (s.status !== 'online') return { ...s, latest: null };
      const { data: latest } = await supabase
        .from('c2_telemetry')
        .select('*')
        .eq('session_id', s.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return { ...s, latest: latest || null };
    })
  );

  return Response.json({ sessions: withTelemetry });
}
