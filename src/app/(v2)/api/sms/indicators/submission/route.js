// Skylog V2.0 — constancia del envío anual de indicadores SPI a la Aerocivil (plazo: antes del 30 de marzo).
// GET: vigencias ya marcadas (cualquier miembro). POST: un gestor marca la vigencia como enviada (upsert por
// organización + año). Apaga el recordatorio de /api/cron/regulatory-reminders.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const { data, error } = await supabase
    .from('sms_indicator_submissions')
    .select('year, sent_at, notes, sentBy:sent_by(full_name)')
    .eq('organization_id', organizationId)
    .order('year', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ submissions: data || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { organizationId, year, notes } = await request.json().catch(() => ({}));
  const y = Number(year);
  if (!organizationId || !Number.isInteger(y) || y < 2000 || y > 2100) {
    return Response.json({ error: 'organizationId y year (vigencia) son requeridos' }, { status: 400 });
  }
  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede marcar el envío de los indicadores' }, { status: 403 });

  const { data, error } = await supabase
    .from('sms_indicator_submissions')
    .upsert({ organization_id: organizationId, year: y, sent_by: personId, sent_at: new Date().toISOString(), notes: notes?.trim() || null }, { onConflict: 'organization_id,year' })
    .select('year, sent_at, notes, sentBy:sent_by(full_name)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ submission: data });
}
