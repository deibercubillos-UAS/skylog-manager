// Skylog V2.0 — reporte PÚBLICO de un suceso, sin cuenta (RAC 219 §219.110: terceros, socios y contratistas
// deben poder notificar). Endpoint ABIERTO: todo lo que llega es hostil hasta demostrar lo contrario.
//   · el token identifica la organización (no adivinable, revocable); uno inválido da 404 genérico
//   · límite por IP y por token (en memoria) + tope por organización en la base (sobrevive a varias instancias)
//   · campo trampa (honeypot) para bots: responde 200 sin guardar nada
//   · el evento oficial lo resuelve el servidor; severidad, longitudes y fecha se validan igual que el reporte interno
//   · el ENLACE define el tipo (40b): el token del enlace VOR crea un VOR; el del enlace MOR crea un MOR que
//     conserva la compuerta de análisis del Gerente SMS; un suceso grave va por RAC 114 por cualquier enlace
//   · los campos y preguntas propias salen de la definición del tipo (el formulario público se arma de ahí)
// Lo escribe el servidor con service role; quien reporta no puede leer nada de vuelta.
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { notifyNewReport } from '@/lib/v2/smsAlerts';
import { storeReportAttachment, attachmentProblem } from '@/lib/v2/reportAttachments';
import { routeForPublicLink, validateReportFormSubmission, effectiveFormFields, REPORT_SEVERITY_LEVELS, UAS_EVENT_OPTIONS, OTHER_EVENT_ID } from '@skylog/domain';

const MAX_PUBLIC_FILES = 3;
const MAX_PUBLIC_TOTAL_BYTES = 4 * 1024 * 1024; // un solo cuerpo de petición: el límite de Vercel es ~4,5 MB
const MAX_PUBLIC_PER_ORG_PER_HOUR = 30;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const FORM_FIELD_COLS = 'id, kind, field_key, label, input_type, options, required, visible, locked, sort_order';
// En el formulario público no se piden aeronave ni vuelo (un tercero no conoce la flota de la organización).
const PUBLIC_EXCLUDE = ['aircraft', 'flight'];

// Resuelve el enlace (no adivinable, revocable) → organización + tipo del formulario. Uno inválido da null.
async function findLink(admin, token) {
  if (!TOKEN_RE.test(token || '')) return null;
  const { data } = await admin
    .from('sms_report_public_links')
    .select('report_type, organization_id, organizations:organization_id(company_name)')
    .eq('token', token)
    .eq('enabled', true)
    .maybeSingle();
  if (!data) return null;
  return { id: data.organization_id, company_name: data.organizations?.company_name, report_type: data.report_type };
}

async function publicFields(admin, organizationId, type) {
  const { data } = await admin.from('sms_report_form_fields').select(FORM_FIELD_COLS).eq('organization_id', organizationId).eq('report_type', type);
  return effectiveFormFields(type, data || []).filter((f) => !PUBLIC_EXCLUDE.includes(f.field_key));
}

const notFound = () => Response.json({ error: 'Este enlace de reporte no está disponible.' }, { status: 404 });

export async function GET(request, { params }) {
  params = await params;
  const { token } = await params;
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`sms-public-get:${ip}`, { limit: 60, windowMs: 60_000 })).allowed) return Response.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: 'El servicio de reportes no está disponible por ahora.' }, { status: 503 });

  const admin = createAdminClient();
  const link = await findLink(admin, token);
  if (!link) return notFound();
  const fields = (await publicFields(admin, link.id, link.report_type)).filter((f) => f.visible);
  return Response.json({ organization: { name: link.company_name }, type: link.report_type, fields });
}

export async function POST(request, { params }) {
  params = await params;
  const { token } = await params;
  const ip = getClientIp(request);
  if (!(await checkRateLimit(`sms-public:${ip}`, { limit: 10, windowMs: 3_600_000 })).allowed || !(await checkRateLimit(`sms-public-token:${token}`, { limit: 40, windowMs: 3_600_000 })).allowed) {
    return Response.json({ error: 'Se enviaron demasiados reportes desde esta conexión. Intenta de nuevo más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El servicio de reportes no está disponible por ahora.' }, { status: 503 });

  const admin = createAdminClient();
  const link = await findLink(admin, token);
  if (!link) return notFound();

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  if (form.get('website')) return Response.json({ ok: true, reference: 'XXXXXXXX' }); // honeypot: el bot cree que funcionó

  let data;
  try {
    data = JSON.parse(form.get('data') || '{}');
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
  const { severity = 'incidente', description, eventId, eventCode, eventLabel, occurredAt, location, contact, confidential, customFields } = data;

  // Validar contra la definición del tipo del enlace (sin aeronave/vuelo: no se piden en el formulario público).
  const fieldDefs = await publicFields(admin, link.id, link.report_type);
  const check = validateReportFormSubmission({
    fieldDefs,
    standardValues: { event: eventId, severity, occurred_at: occurredAt, location, description, confidential: !!confidential },
    customValues: customFields || {},
    now: new Date().toISOString(),
    severities: REPORT_SEVERITY_LEVELS,
  });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

  const files = form.getAll('files').filter((f) => f && typeof f !== 'string');
  if (files.length > MAX_PUBLIC_FILES) return Response.json({ error: `Máximo ${MAX_PUBLIC_FILES} archivos.` }, { status: 400 });
  if (files.reduce((s, f) => s + f.size, 0) > MAX_PUBLIC_TOTAL_BYTES) return Response.json({ error: 'Los archivos suman más de 4 MB.' }, { status: 413 });
  for (const f of files) {
    const problem = attachmentProblem(f);
    if (problem) return Response.json({ error: `${f.name}: ${problem}` }, { status: 400 });
  }

  // Tope por organización contra inundación de reportes falsos (cuenta en la base, no en memoria).
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from('sms_reports').select('id', { count: 'exact', head: true }).eq('organization_id', link.id).eq('source', 'public').gte('created_at', since);
  if ((count || 0) >= MAX_PUBLIC_PER_ORG_PER_HOUR) return Response.json({ error: 'Esta organización recibió muchos reportes en la última hora. Intenta de nuevo más tarde.' }, { status: 429 });

  let route;
  try {
    route = routeForPublicLink({ linkType: link.report_type, severity }); // el enlace define el tipo (grave → RAC 114)
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const official = UAS_EVENT_OPTIONS.find((o) => o.id === eventId);
  const isOther = eventId === OTHER_EVENT_ID;

  const { data: report, error } = await admin
    .from('sms_reports')
    .insert({
      organization_id: link.id,
      reported_by: null,
      severity,
      route: route.route,
      requires_manager_analysis: route.requiresManagerAnalysis,
      event_code: official ? official.code : isOther ? String(eventCode || '').trim().slice(0, 40) || null : null,
      event_label: official ? official.label : isOther ? String(eventLabel || '').trim().slice(0, 200) || null : null,
      description: String(description).trim(),
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
      location: String(location || '').trim().slice(0, 300) || null,
      reporter_contact: String(contact || '').trim().slice(0, 150) || null,
      confidentiality_level: confidential ? 'confidencial' : 'normal',
      custom_fields: check.customFields,
      source: 'public',
    })
    .select('id, route, severity, event_label, description, source')
    .single();
  if (error) return Response.json({ error: 'No se pudo registrar el reporte. Intenta de nuevo.' }, { status: 500 });

  await notifyNewReport({ organizationId: link.id, report });

  const failed = [];
  for (const file of files) {
    const out = await storeReportAttachment({ organizationId: org.id, reportId: report.id, file, uploadedBy: null });
    if (out.error) failed.push(file.name);
  }

  return Response.json({ ok: true, reference: report.id.slice(0, 8).toUpperCase(), route: report.route, failedFiles: failed });
}
