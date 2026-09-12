// Skylog V2.0 — F3. Filtraje/análisis inicial de un reporte MOR por el Gerente
// SMS, exigido antes de poder radicarlo (12-directivas-maut.md §2.1: "una vez
// el Gerente de SMS haya realizado el respectivo filtraje y análisis inicial").
// Un VOR nunca pasa por aquí — canFileReport() ya lo permite sin este paso.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { reportId } = body;
  if (!reportId) return Response.json({ error: 'reportId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: report, error: reportError } = await supabase
    .from('sms_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();
  if (reportError) return Response.json({ error: 'Error verificando el reporte' }, { status: 500 });
  if (!report) return Response.json({ error: 'Reporte no encontrado' }, { status: 404 });

  // Solo el Gerente SMS de esa organización analiza — 40-sms.md §5.7 lo fija
  // como el rol nominal, más estricto que v2_is_duty_manager (RLS, más amplio
  // por defensa en profundidad).
  const membership = (memberships || []).find((m) => m.organization_id === report.organization_id);
  if (!membership || membership.role !== 'gerente_sms') {
    return Response.json({ error: 'Solo el Gerente SMS designado puede analizar este reporte' }, { status: 403 });
  }
  if (report.route !== 'mor') {
    return Response.json({ error: 'Solo un reporte MOR exige este análisis previo' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('sms_reports')
    .update({ analyzed_by: personId, analyzed_at: new Date().toISOString() })
    .eq('id', reportId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ report: data });
}
