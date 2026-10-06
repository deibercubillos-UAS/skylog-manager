// Skylog V2.0 — Despacho. Vista previa: qué verifica el sistema hoy para esta misión y qué hay
// que diligenciar (listas de chequeo de Prevuelo, matriz de riesgo). Solo lectura; no decide
// nada — POST /api/despacho vuelve a evaluar todo antes de escribir.
import { createClientSSR } from '@/lib/supabaseServer';
import { loadDispatchContext } from '@/lib/v2/dispatchContext';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const missionId = new URL(request.url).searchParams.get('missionId');
  if (!missionId) return Response.json({ error: 'missionId es requerido' }, { status: 400 });

  const ctx = await loadDispatchContext(supabase, { userId: user.id, missionId });
  if (!ctx.ok) return Response.json({ error: ctx.error }, { status: ctx.status });

  const { mission } = ctx;
  return Response.json({
    mission: {
      id: mission.id,
      name: mission.name,
      zone: mission.zone,
      scheduled_at: mission.scheduled_at,
      status: mission.status,
      line_of_sight: mission.line_of_sight,
      aircraft: mission.aircraft ? { serial_number: mission.aircraft.serial_number, model: mission.aircraft.model } : null,
    },
    gates: ctx.gates,
    canDispatch: ctx.canDispatch,
    blockedBy: ctx.blockedBy,
    checklists: ctx.checklists,
    riskMatrix: ctx.riskMatrix,
  });
}
