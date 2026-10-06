// Skylog V2.0 — F3. Radicar un reporte (marcar filed_at) — solo cuando
// canFileReport() lo permite: nunca para rac114, y un MOR exige analyzed_at
// ya presente (12-directivas-maut.md §2.1). Recalculado server-side, nunca
// se confía en que el cliente "sepa" que ya cumple los requisitos.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { canFileReport } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { reportId, irisReference } = body;
  if (!reportId) return Response.json({ error: 'reportId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { data: report, error: reportError } = await supabase
    .from('sms_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (reportError) return Response.json({ error: 'Error verificando el reporte' }, { status: 500 });
  if (!report) return Response.json({ error: 'Reporte no encontrado' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === report.organization_id);
  if (!membership || membership.role !== 'gerente_sms') {
    return Response.json({ error: 'Solo el Gerente SMS designado puede radicar' }, { status: 403 });
  }
  if (report.filed_at) return Response.json({ error: 'Este reporte ya fue radicado.' }, { status: 409 });

  const canFile = canFileReport({
    route: report.route,
    requiresManagerAnalysis: report.requires_manager_analysis,
    analyzedAt: report.analyzed_at,
  });
  if (!canFile) {
    return Response.json(
      { error: report.route === 'rac114' ? 'No se radica por MOR/VOR — sigue el procedimiento RAC 114' : 'Falta el análisis previo del Gerente SMS' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('sms_reports')
    .update({ filed_at: new Date().toISOString(), iris_reference: typeof irisReference === 'string' && irisReference.trim() ? irisReference.trim().slice(0, 100) : null })
    .eq('id', reportId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ report: data });
}
