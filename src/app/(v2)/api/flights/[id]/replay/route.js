// Skylog V2.0 — Replay GPS. Trae la traza completa de un vuelo puntual —
// separado de GET /api/flights (que solo manda `has_replay`, ver esa ruta)
// para no pagar el costo de 400 puntos × 200 filas en cada carga de
// Bitácora. La visibilidad la sigue decidiendo la RLS de `flights` (mismo
// criterio que el resto de rutas de vuelos): no se repite el chequeo de rol
// aquí, basta con que la fila se devuelva o no.
//
// Custodia legal (ítem 34 de MAUT-5.0-12-095): si el vuelo está bajo una
// custodia activa, CADA consulta del replay queda registrada en la bitácora
// de la custodia (quién y cuándo) — la escribe el servidor con service role,
// porque un piloto que ve el replay no puede ver ni escribir custodias por
// RLS. Falla CERRADO: si no se puede dejar la constancia, no se entrega el
// material (un acceso sin rastro es justo lo que la custodia debe impedir).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';

export async function GET(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase.from('flights').select('replay_track').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: 'Error consultando el replay' }, { status: 500 });
  if (!data) return Response.json({ error: 'Vuelo no encontrado' }, { status: 404 });
  if (!data.replay_track) return Response.json({ error: 'Este vuelo no tiene replay GPS' }, { status: 404 });

  // Solo después de confirmar que el usuario SÍ ve el vuelo: no se filtra el estado de custodia de vuelos ajenos.
  // Verificar la custodia exige service role; sin llave real se dice por qué en vez de un 503 mudo.
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  const admin = createAdminClient();
  const { data: activeHolds, error: holdError } = await admin
    .from('legal_hold_flights')
    .select('hold_id, legal_holds!inner(released_at)')
    .eq('flight_id', id)
    .is('legal_holds.released_at', null);
  if (holdError) return Response.json({ error: 'No se pudo verificar la custodia legal del vuelo' }, { status: 503 });

  if (activeHolds?.length) {
    const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
    if (resolveError) return Response.json({ error: 'No se pudo identificar a quien consulta' }, { status: 503 });

    const { error: logError } = await admin.from('legal_hold_events').insert(
      activeHolds.map((h) => ({ hold_id: h.hold_id, event_type: 'accessed', actor_person_id: personId, flight_id: id, detail: 'Consulta de replay GPS' }))
    );
    if (logError) {
      return Response.json({ error: 'Este vuelo está bajo custodia legal y no se pudo registrar el acceso; no se entrega el replay.' }, { status: 503 });
    }
  }

  return Response.json({ track: data.replay_track });
}
