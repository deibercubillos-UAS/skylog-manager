// Skylog V2.0 — SMS-G: marcar un período como enviado a la Aerocivil —
// deja constancia real de quién y cuándo, mismo patrón ya probado en v1
// (`aerocivil_monthly_reports`). Upsert por (organization_id, period).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, period, notes } = body;
  if (!organizationId || !/^\d{4}-\d{2}$/.test(period || '')) {
    return Response.json({ error: 'organizationId y period (YYYY-MM) son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede marcar el envío del paquete mensual' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_monthly_reports')
    .upsert({ organization_id: organizationId, period, sent_by: personId, sent_at: new Date().toISOString(), notes: notes?.trim() || null }, { onConflict: 'organization_id,period' })
    .select('*, sentBy:sent_by(full_name)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ status: data });
}
