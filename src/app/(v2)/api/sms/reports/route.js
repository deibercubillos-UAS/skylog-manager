// Skylog V2.0 — F3. Reportes de seguridad operacional (MOR/VOR).
// docs/skylog-v2/40-sms.md §5.7 · 12-directivas-maut.md §2.
//
// "Diligenciar" es abierto por diseño — cualquier miembro de la organización
// puede crear un reporte (no solo Gerente SMS). La ruta (mor/vor/rac114) y si
// exige análisis previo se calculan server-side con classifyReportRoute() —
// nunca se confía en un valor mandado por el cliente (regla S2).
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
  const { organizationId, severity, description, eventCode, confidentialityLevel } = body;
  if (!organizationId || !severity || !description) {
    return Response.json({ error: 'organizationId, severity y description son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  if (!membership) return Response.json({ error: 'Esta cuenta no pertenece a esa organización' }, { status: 403 });

  let route;
  try {
    route = classifyReportRoute({ severity, reportedByRole: membership.role });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('sms_reports')
    .insert({
      organization_id: organizationId,
      reported_by: personId,
      severity,
      route: route.route,
      requires_manager_analysis: route.requiresManagerAnalysis,
      event_code: eventCode || null,
      description,
      confidentiality_level: confidentialityLevel === 'confidencial' ? 'confidencial' : 'normal',
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // accidente/incidente_grave bifurca a RAC 114 (§2.5) — nunca abre un caso
  // MOR/VOR. El reporte queda como evidencia, sin caso asociado todavía
  // (diseño de esa rama pendiente, ver 12-directivas-maut.md §2.5).
  if (route.route === 'rac114') {
    return Response.json({
      report: data,
      warning: 'Clasificado como accidente/incidente grave — no se radica por MOR/VOR. Sigue el procedimiento RAC 114 (rama pendiente de diseñar en Skylog V2.0).',
    });
  }

  return Response.json({ report: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  let query = supabase
    .from('sms_reports')
    .select('*, sms_cases(id, status, assigned_to)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  // RLS ya filtra "propios o de mi organización si soy gestor" — este acotado
  // adicional evita que un no-gestor vea la lista completa si por error se le
  // pasara una organizationId ajena (defensa en profundidad, no sustituye RLS).
  if (!isDutyManager(memberships, organizationId)) {
    query = query.eq('reported_by', personId);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ reports: data });
}
