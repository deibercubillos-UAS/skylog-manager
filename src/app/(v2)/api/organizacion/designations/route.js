// Skylog V2.0 — Designaciones por acta (RAC 100 §100.535(14)(15)(16)): Jefe de Pilotos y Ejecutivo
// Responsable. Designar a alguien nuevo cierra la designación vigente del mismo cargo (cargo único) y deja el
// historial. El Gerente SMS se designa en /sms/gobernanza (validación de perfil propia), aquí solo se lista.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { validateDesignationInput, DESIGNATION_ROLES } from '@skylog/domain';

const AUTHORITY_ROLES = ['admin', 'gerente_sms', 'superadmin']; // mismo criterio que levantar una custodia

async function session() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, memberships };
}

export async function GET(request) {
  const s = await session();
  if (s.error) return s.error;
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId || !(s.memberships || []).some((m) => m.organization_id === organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }
  const { data, error } = await s.supabase
    .from('designations')
    .select('id, role_type, started_at, ended_at, act_reference, act_date, act_document_path, resume_document_path, person:person_id(id, full_name)')
    .eq('organization_id', organizationId)
    .order('started_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const canDesignate = (s.memberships || []).some((m) => m.organization_id === organizationId && AUTHORITY_ROLES.includes(m.role));
  // Las rutas de archivo no salen del servidor: solo si el acta y la hoja de vida están cargadas.
  const designations = (data || []).map(({ act_document_path, resume_document_path, ...d }) => ({ ...d, has_act_document: !!act_document_path, has_resume_document: !!resume_document_path }));
  const canView = (s.memberships || []).some((m) => m.organization_id === organizationId && ['admin', 'jefe_pilotos', 'gerente_sms', 'superadmin'].includes(m.role));
  return Response.json({ designations, roles: DESIGNATION_ROLES, canDesignate, canView });
}

export async function POST(request) {
  const s = await session();
  if (s.error) return s.error;
  const body = await request.json().catch(() => ({}));
  const { organizationId, roleType, personId, actReference, actDate } = body;
  if (!organizationId || !(s.memberships || []).some((m) => m.organization_id === organizationId && AUTHORITY_ROLES.includes(m.role))) {
    return Response.json({ error: 'Solo el Gerente General o el Gerente SMS pueden designar cargos' }, { status: 403 });
  }
  const check = validateDesignationInput({ roleType, personId, actReference, actDate, today: bogotaDay(new Date()) });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

  const { data: member } = await s.supabase.from('memberships').select('id').eq('person_id', personId).eq('organization_id', organizationId).eq('status', 'activa').maybeSingle();
  if (!member) return Response.json({ error: 'La persona no tiene membresía activa en esta organización' }, { status: 404 });

  // Cargo único: se cierra la vigente antes de abrir la nueva.
  const { error: closeError } = await s.supabase
    .from('designations')
    .update({ ended_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('role_type', roleType)
    .is('ended_at', null);
  if (closeError) return Response.json({ error: closeError.message }, { status: 500 });

  const { data, error } = await s.supabase
    .from('designations')
    .insert({ organization_id: organizationId, person_id: personId, role_type: roleType, act_reference: actReference.trim(), act_date: actDate })
    .select('id, role_type, started_at, act_reference, act_date, person:person_id(id, full_name)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ designation: data });
}
