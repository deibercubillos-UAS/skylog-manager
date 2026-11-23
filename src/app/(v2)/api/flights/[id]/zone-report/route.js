// Skylog V2.0 — Salida de zona (SMS). El piloto de un vuelo que salió de la zona de operación
// registra aquí los MOTIVOS. Eso crea un reporte SMS automático (source `auto_zone_excursion`,
// enlazado al vuelo) y AVISA al Gerente SMS para que verifique y haga seguimiento del caso
// (decisión del usuario, 2026-11-22; mismo patrón que /api/duty/exceptions). Ver 40-sms.md, regla S.
//
// Se escribe con la llave de servicio DESPUÉS de verificar sesión, persona, membresía y que el vuelo
// de verdad tenga una salida pendiente de reporte. `route`/`requires_manager_analysis` los calcula
// classifyReportRoute server-side (regla S2): nunca se confía en lo que manda el cliente.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getAuthUser } from '@/lib/v2/authUser';
import { classifyReportRoute } from '@skylog/domain';
import { notifyNewReport } from '@/lib/v2/smsAlerts';
import { dbError } from '@/lib/v2/apiErrors';

export const dynamic = 'force-dynamic';

const MIGRATION_MISSING = { error: 'Falta aplicar la migración de salida de zona en la base de datos.' };

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const motivos = typeof body.motivos === 'string' ? body.motivos.trim() : '';
  if (motivos.length < 5 || motivos.length > 2000) {
    return Response.json({ error: 'Describe los motivos de la salida de zona (entre 5 y 2000 caracteres)' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: flight, error } = await admin
    .from('flights')
    .select('id, organization_id, pilot_person_id, aircraft_id, takeoff_at, location, zone_excursion, zone_report_status, voided_at')
    .eq('id', id)
    .maybeSingle();
  if (error) return Response.json(error.code === '42703' ? MIGRATION_MISSING : { error: 'Error consultando el vuelo' }, { status: error.code === '42703' ? 503 : 500 });
  // Un vuelo de otra organización se responde como inexistente (no se confirma que existe).
  if (!flight || flight.voided_at || !(memberships || []).some((m) => m.organization_id === flight.organization_id)) {
    return Response.json({ error: 'Vuelo no encontrado' }, { status: 404 });
  }
  // El reporte de motivos lo diligencia el propio piloto del vuelo (a él se le pidió).
  if (flight.pilot_person_id !== personId) {
    return Response.json({ error: 'Solo el piloto del vuelo puede registrar los motivos de la salida de zona' }, { status: 403 });
  }
  if (flight.zone_report_status !== 'pendiente') {
    return Response.json({ error: 'Este vuelo no tiene una salida de zona pendiente de reporte' }, { status: 409 });
  }

  const membership = (memberships || []).find((m) => m.organization_id === flight.organization_id);
  const route = classifyReportRoute({ severity: 'incidente', reportedByRole: membership?.role });

  const ex = flight.zone_excursion || {};
  const segments = Array.isArray(ex.segments) ? ex.segments : [];
  const description =
    `Salida de la zona de operación detectada automáticamente al cargar el vuelo. ` +
    `Máxima distancia fuera del perímetro: ${ex.maxExceedM ?? '—'} m` +
    (segments.length ? `; ${segments.length} tramo(s) fuera de la zona` : '') + `.\n\n` +
    `Motivos del piloto: ${motivos}`;

  const { data: report, error: reportError } = await admin
    .from('sms_reports')
    .insert({
      organization_id: flight.organization_id,
      reported_by: personId,
      severity: 'incidente',
      route: route.route,
      requires_manager_analysis: route.requiresManagerAnalysis,
      event_label: 'Salida de la zona de operación',
      description,
      source: 'auto_zone_excursion',
      flight_id: flight.id,
      occurred_at: flight.takeoff_at,
      location: flight.location || null,
      aircraft_id: flight.aircraft_id || null,
    })
    .select()
    .single();
  if (reportError) return dbError(reportError, 'flights/[id]/zone-report');

  // Marca el vuelo: el reporte ya se envió (idempotente — un segundo intento choca con el 409 de arriba).
  await admin.from('flights').update({ zone_report_status: 'enviado' }).eq('id', flight.id);

  // Avisa al Gerente SMS (campana + correo) para que verifique y abra el seguimiento del caso.
  // Best-effort: un fallo del aviso no revierte el reporte ya guardado.
  try {
    await notifyNewReport({ organizationId: flight.organization_id, report });
  } catch (e) {
    console.error('[flights/zone-report] aviso al Gerente SMS falló:', e.message);
  }

  return Response.json({ report });
}
