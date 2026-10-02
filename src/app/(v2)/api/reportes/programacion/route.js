// Skylog V2.0 — Reportes: Programación y Autorizaciones — expediente por
// autorización + análisis de riesgos asociado (RAC 100 §100.535(24)-(25)).
// Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const STATUS_LABELS = { borrador: 'Borrador', radicado: 'Radicado', en_revision: 'En revisión', autorizado: 'Autorizado', negado: 'Negado' };

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('missions')
    .select(
      `id, name, zone, line_of_sight, scheduled_at,
       pic:pic_person_id(full_name),
       aircraft:aircraft_id(serial_number, model:model_id(brand, model)),
       authorization:authorization_id(status, radicado_number, risk_analyses(can_sign, signed_at))`
    )
    .eq('organization_id', organizationId)
    .order('scheduled_at', { ascending: false });
  if (from) query = query.gte('scheduled_at', from);
  if (to) query = query.lte('scheduled_at', `${to}T23:59:59`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const missions = (data || []).map((m) => {
    const risk = Array.isArray(m.authorization?.risk_analyses) ? m.authorization.risk_analyses[0] : null;
    return {
      name: m.name,
      scheduled_at: m.scheduled_at,
      zone: m.zone,
      line_of_sight: m.line_of_sight,
      pic_name: m.pic?.full_name || '—',
      aircraft_label: m.aircraft ? [m.aircraft.serial_number, m.aircraft.model && `${m.aircraft.model.brand} ${m.aircraft.model.model}`].filter(Boolean).join(' — ') : '—',
      radicado_number: m.authorization?.radicado_number || null,
      authorization_status: m.authorization ? STATUS_LABELS[m.authorization.status] || m.authorization.status : null,
      has_risk_analysis: !!risk,
      risk_signed: !!risk?.signed_at,
    };
  });

  return Response.json({ missions });
}
