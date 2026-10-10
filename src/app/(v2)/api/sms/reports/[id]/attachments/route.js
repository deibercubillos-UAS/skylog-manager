// Skylog V2.0 — evidencias adjuntas de un reporte. Suben quien reportó (su propio reporte) y el Gerente
// SMS; la tabla solo la escribe el servidor (ver lib/v2/reportAttachments.js). Se leen con el mismo
// alcance que el reporte (RLS de sms_reports).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem, storageProblem } from '@/lib/v2/adminKey';
import { storeReportAttachment } from '@/lib/v2/reportAttachments';

export async function POST(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const keyProblem = adminKeyProblem() || storageProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const { id } = await params;
  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  // La RLS de sms_reports ya limita a "mi reporte o soy gestor"; además solo el autor o el Gerente SMS adjuntan.
  const { data: report, error: reportError } = await supabase.from('sms_reports').select('id, organization_id, reported_by').eq('id', id).maybeSingle();
  if (reportError) return Response.json({ error: 'Error consultando el reporte' }, { status: 500 });
  if (!report) return Response.json({ error: 'Reporte no encontrado' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === report.organization_id);
  const isAuthor = report.reported_by === personId;
  const isAnalyst = membership?.role === 'gerente_sms' || membership?.role === 'superadmin';
  if (!isAuthor && !isAnalyst) return Response.json({ error: 'Solo quien reportó o el Gerente SMS pueden adjuntar evidencias' }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const result = await storeReportAttachment({ organizationId: report.organization_id, reportId: id, file, uploadedBy: personId });
  if (result.error) return Response.json({ error: result.error }, { status: result.status });

  // Si el reporte ya tiene caso, queda en su línea de tiempo (el servidor escribe: el autor puede no ser analista).
  const admin = createAdminClient();
  const { data: caseRow } = await admin.from('sms_cases').select('id').eq('report_id', id).maybeSingle();
  if (caseRow) {
    await admin.from('sms_case_events').insert({ case_id: caseRow.id, organization_id: report.organization_id, event_type: 'adjunto_agregado', payload: { file_name: result.attachment.file_name }, created_by: personId });
  }

  return Response.json({ attachment: result.attachment });
}

export async function GET(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase.from('sms_report_attachments').select('id, file_name, content_type, size_bytes, created_at').eq('report_id', id).order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ attachments: data || [] });
}
