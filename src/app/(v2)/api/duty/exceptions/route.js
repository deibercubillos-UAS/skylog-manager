// Skylog V2.0 — F5. Excepción documentada y autorizada por el Jefe de Pilotos (u
// otro rol de gestión) a un límite de §100.540, cuando la norma lo permite. Ver
// docs/skylog-v2/41-tiempos-servicio.md §1.2 · 31-esquema-datos.md §3.1.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { classifyReportRoute } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, dutyPeriodId, reason, evidenceDocId } = body;
  if (!organizationId || !dutyPeriodId || !reason) {
    return Response.json({ error: 'organizationId, dutyPeriodId y reason son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede autorizar una excepción' }, { status: 403 });
  }

  // Verifica que el período referenciado pertenezca a la misma organización —
  // nunca se confía en el id que manda el cliente (mismo patrón ya usado en
  // producción para sora_assessment_id/related_barrier_id).
  const { data: period, error: periodError } = await supabase
    .from('duty_periods')
    .select('id, organization_id')
    .eq('id', dutyPeriodId)
    .maybeSingle();
  if (periodError) return Response.json({ error: 'Error verificando el período' }, { status: 500 });
  if (!period || period.organization_id !== organizationId) {
    return Response.json({ error: 'El período no existe o no pertenece a esta organización' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('duty_exceptions')
    .insert({
      organization_id: organizationId,
      duty_period_id: dutyPeriodId,
      reason,
      authorized_by: personId,
      evidence_doc_id: evidenceDocId || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // F3 §5.4 — "SMS alimentado por la operación": una excepción a un límite de
  // §100.540 es un riesgo de fatiga real que ya ocurrió — se convierte solo en
  // un borrador de reporte SMS, nunca en un reporte radicado (el Gerente SMS
  // sigue confirmando/analizando/descartando por el flujo normal de casos).
  // Fire-and-forget: nunca bloquea ni rompe el registro de la excepción en sí.
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  try {
    const route = classifyReportRoute({ severity: 'incidente', reportedByRole: membership?.role });
    await supabase.from('sms_reports').insert({
      organization_id: organizationId,
      reported_by: personId,
      severity: 'incidente',
      route: route.route,
      requires_manager_analysis: route.requiresManagerAnalysis,
      event_code: 'MED',
      description: `Borrador automático — excepción de tiempo de servicio autorizada (§100.540): ${reason}`,
      source: 'auto_duty_exception',
    });
  } catch {
    // silencioso — el registro de la excepción ya se guardó, el borrador SMS
    // es un efecto secundario informativo, no una obligación que la bloquee.
  }

  return Response.json({ exception: data });
}
