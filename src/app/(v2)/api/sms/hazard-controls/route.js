// Skylog V2.0 — SMS Matriz de peligros. Controles definidos sobre el catálogo
// de peligros (`hazards`). Lectura: cualquier miembro (P1). Escritura: gestor
// SMS (P2). Campos explícitos en la inserción (nunca { ...body }).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit, membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

const CONTROL_TYPES = ['preventivo', 'mitigador', 'recuperacion'];

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'P1')) {
    return Response.json({ error: 'Tu rol no puede ver la matriz de peligros' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('hazard_controls')
    .select('*, updates:hazard_control_updates(id, note, progress_pct, evidence_path, created_at)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return dbError(error, 'sms/hazard-controls');

  // La ruta del archivo de evidencia nunca se expone: solo si existe.
  const controls = (data || []).map((c) => ({
    ...c,
    updates: (c.updates || [])
      .map((u) => ({ id: u.id, note: u.note, progress_pct: u.progress_pct, created_at: u.created_at, has_evidence: Boolean(u.evidence_path) }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }));
  return Response.json({ controls, isManager: membershipsCanEdit(memberships, organizationId, 'P2') });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, hazardId, description, controlType, responsible, dueDate } = body;
  if (!organizationId || !hazardId || !description) {
    return Response.json({ error: 'organizationId, hazardId y description son requeridos' }, { status: 400 });
  }
  if (controlType && !CONTROL_TYPES.includes(controlType)) {
    return Response.json({ error: 'controlType inválido' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede definir controles' }, { status: 403 });
  }

  const { data: hazard, error: hazardError } = await supabase.from('hazards').select('id').eq('id', hazardId).eq('organization_id', organizationId).maybeSingle();
  if (hazardError) return Response.json({ error: 'Error verificando el peligro' }, { status: 500 });
  if (!hazard) return Response.json({ error: 'El peligro no pertenece a esta organización' }, { status: 400 });

  const { data, error } = await supabase
    .from('hazard_controls')
    .insert({
      organization_id: organizationId,
      hazard_id: hazardId,
      description: description.trim().slice(0, 1000),
      control_type: controlType || null,
      responsible: typeof responsible === 'string' && responsible.trim() ? responsible.trim().slice(0, 200) : null,
      due_date: dueDate || null,
      created_by: personId,
    })
    .select('*, updates:hazard_control_updates(id)')
    .single();
  if (error) return dbError(error, 'sms/hazard-controls');
  return Response.json({ control: { ...data, updates: [] } });
}
