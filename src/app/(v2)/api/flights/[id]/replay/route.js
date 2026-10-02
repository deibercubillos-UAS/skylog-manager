// Skylog V2.0 — Replay GPS. Trae la traza completa de un vuelo puntual —
// separado de GET /api/flights (que solo manda `has_replay`, ver esa ruta)
// para no pagar el costo de 400 puntos × 200 filas en cada carga de
// Bitácora. La visibilidad la sigue decidiendo la RLS de `flights` (mismo
// criterio que el resto de rutas de vuelos): no se repite el chequeo de rol
// aquí, basta con que la fila se devuelva o no.
import { createClientSSR } from '@/lib/supabaseServer';

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

  return Response.json({ track: data.replay_track });
}
