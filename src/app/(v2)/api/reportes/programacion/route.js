// Skylog V2.0 — Reportes: Programación y Autorizaciones — expediente por
// autorización + análisis de riesgos asociado (RAC 100 §100.535(24)-(25)).
// Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

const STATUS_LABELS = { borrador: 'Borrador', radicado: 'Radicado', en_revision: 'En revisión', autorizado: 'Autorizado', negado: 'Negado' };

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('missions')
    .select(
      `id, name, zone, line_of_sight, scheduled_at, authorization_id,
       pic:pic_person_id(full_name),
       aircraft:aircraft_id(serial_number, model:model_id(brand, model))`
    )
    .eq('organization_id', organizationId)
    .order('scheduled_at', { ascending: false });
  if (from) query = query.gte('scheduled_at', from);
  if (to) query = query.lte('scheduled_at', `${to}T23:59:59`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // `missions.authorization_id` no tiene llave foránea: la autorización y su análisis de riesgos se piden aparte.
  const authIds = [...new Set((data || []).map((m) => m.authorization_id).filter(Boolean))];
  const [{ data: auths }, { data: risks }] = authIds.length
    ? await Promise.all([
        supabase.from('authorization_requests').select('id, status, radicado_number').in('id', authIds),
        supabase.from('risk_analyses').select('authorization_id, can_sign, signed_at').in('authorization_id', authIds),
      ])
    : [{ data: [] }, { data: [] }];
  const authById = Object.fromEntries((auths || []).map((a) => [a.id, a]));
  const riskByAuth = Object.fromEntries((risks || []).map((r) => [r.authorization_id, r]));

  const missions = (data || []).map((m0) => {
    const m = { ...m0, authorization: authById[m0.authorization_id] || null };
    const risk = riskByAuth[m0.authorization_id] || null;
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
