// Skylog V2.0 — Gestión del cambio del SMS (RAC 219 §219.105(c)(2)). Todo miembro lee; un gestor crea y
// avanza. El servidor revalida cada paso de estado con `evaluateTransition` (no confía en la pantalla) y
// la RLS de `sms_changes` es la última barrera.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { validateChangeInput, evaluateTransition, CHANGE_STATUSES, SAFETY_IMPACTS } from '@skylog/domain';

const SELECT = '*, hazard:hazard_id(id, description), responsible:responsible_id(full_name)';
const EDITABLE = ['title', 'description', 'change_type', 'planned_date', 'safety_impact', 'impact_justification', 'human_factors_notes', 'hazard_id', 'responsible_id', 'decision_notes'];

async function session(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, personId, memberships };
}

export async function GET(request) {
  const s = await session(request);
  if (s.error) return s.error;
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId || !(s.memberships || []).some((m) => m.organization_id === organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }
  const [changes, hazards, members] = await Promise.all([
    s.supabase.from('sms_changes').select(SELECT).eq('organization_id', organizationId).order('created_at', { ascending: false }),
    s.supabase.from('hazards').select('id, description').eq('organization_id', organizationId).order('created_at', { ascending: false }),
    s.supabase.from('memberships').select('person_id, person:person_id(full_name)').eq('organization_id', organizationId).eq('status', 'activa'),
  ]);
  if (changes.error) return Response.json({ error: changes.error.message }, { status: 500 });
  return Response.json({
    changes: changes.data || [],
    hazards: hazards.data || [],
    members: (members.data || []).map((m) => ({ id: m.person_id, name: m.person?.full_name })).filter((m) => m.name),
    isManager: isDutyManager(s.memberships, organizationId),
  });
}

export async function POST(request) {
  const s = await session(request);
  if (s.error) return s.error;
  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId || !isDutyManager(s.memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar un cambio' }, { status: 403 });
  }
  const check = validateChangeInput({ title: body.title, changeType: body.change_type });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

  const row = { organization_id: organizationId, created_by: s.personId, title: body.title.trim() };
  for (const k of EDITABLE) if (k !== 'title' && body[k] !== undefined && body[k] !== '') row[k] = body[k];
  if (row.safety_impact && !SAFETY_IMPACTS.includes(row.safety_impact)) return Response.json({ error: 'Impacto inválido' }, { status: 400 });

  const { data, error } = await s.supabase.from('sms_changes').insert(row).select(SELECT).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ change: data });
}

// PATCH — edita campos y/o avanza el estado (`status`). Un cambio cerrado no se toca.
export async function PATCH(request) {
  const s = await session(request);
  if (s.error) return s.error;
  const body = await request.json().catch(() => ({}));
  if (!body.id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: current, error: findError } = await s.supabase.from('sms_changes').select('*').eq('id', body.id).maybeSingle();
  if (findError) return Response.json({ error: findError.message }, { status: 500 });
  if (!current) return Response.json({ error: 'Cambio no encontrado' }, { status: 404 });
  if (!isDutyManager(s.memberships, current.organization_id)) return Response.json({ error: 'Solo un gestor puede modificar un cambio' }, { status: 403 });
  if (current.status === 'implementado' || current.status === 'descartado') return Response.json({ error: 'Este cambio ya está cerrado.' }, { status: 409 });

  const patch = {};
  for (const k of EDITABLE) if (body[k] !== undefined) patch[k] = body[k] === '' ? null : body[k];
  if (patch.title !== undefined) {
    const check = validateChangeInput({ title: patch.title, changeType: patch.change_type || current.change_type });
    if (!check.ok) return Response.json({ error: check.errors.join(' ') }, { status: 400 });
    patch.title = patch.title.trim();
  }
  if (patch.safety_impact && !SAFETY_IMPACTS.includes(patch.safety_impact)) return Response.json({ error: 'Impacto inválido' }, { status: 400 });

  if (body.status !== undefined) {
    if (!CHANGE_STATUSES.includes(body.status) || body.status === current.status) return Response.json({ error: 'Estado inválido' }, { status: 400 });
    const merged = { ...current, ...patch };
    let hazardAssessed = false;
    if (merged.hazard_id) {
      const { data: assessments } = await s.supabase.from('risk_assessments').select('id').eq('hazard_id', merged.hazard_id).limit(1);
      hazardAssessed = (assessments || []).length > 0;
    }
    const result = evaluateTransition({ change: merged, toStatus: body.status, hazardAssessed });
    if (!result.ok) return Response.json({ error: result.errors.join(' '), errors: result.errors }, { status: 422 });
    patch.status = body.status;
    if (body.status === 'implementado') patch.implemented_at = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) return Response.json({ error: 'Nada que actualizar' }, { status: 400 });
  const { data, error } = await s.supabase.from('sms_changes').update(patch).eq('id', body.id).select(SELECT).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ change: data });
}
