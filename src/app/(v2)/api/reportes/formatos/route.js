// Skylog V2.0 — Reportes: código de formato y versión de cada PDF, definidos por la organización.
// La RAC 100 no impone códigos oficiales: cada operador usa los de su manual de operaciones.
// Se guardan en `organizations.report_formats` (jsonb). Solo un gestor los lee o los cambia; la
// escritura pasa por el cliente admin tras verificar el rol (la tabla no tiene política de UPDATE).
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { sanitizeReportFormats } from '@skylog/domain';
import { membershipsCanView, membershipsCanEdit } from '@/lib/v2/permissions';

async function requireManager(organizationId, mode = 'view') {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { response: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  if (!organizationId) return { response: Response.json({ error: 'organizationId es requerido' }, { status: 400 }) };
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { response: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!(mode === 'edit' ? membershipsCanEdit(memberships, organizationId, 'AC1') : membershipsCanView(memberships, organizationId, 'AC1'))) {
    return { response: Response.json({ error: 'Solo un gestor puede ver o editar los formatos de los reportes' }, { status: 403 }) };
  }
  return { supabase };
}

export async function GET(request) {
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  const guard = await requireManager(organizationId);
  if (guard.response) return guard.response;

  const { data, error } = await guard.supabase.from('organizations').select('report_formats').eq('id', organizationId).maybeSingle();
  // Si la columna todavía no existe (migración sin aplicar), se responde con los valores por defecto
  // en vez de romper la pantalla de Reportes.
  if (error) return Response.json({ formats: {} });
  return Response.json({ formats: data?.report_formats || {} });
}

export async function PUT(request) {
  const body = await request.json().catch(() => ({}));
  const organizationId = body.organizationId;
  const guard = await requireManager(organizationId, 'edit');
  if (guard.response) return guard.response;

  const clean = sanitizeReportFormats(body.formats);
  if (!clean.ok) return Response.json({ error: clean.error }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('organizations').update({ report_formats: clean.value }).eq('id', organizationId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await logAudit({ organizationId, action: 'update', module: 'Reportes', entityLabel: 'Códigos de formato de los reportes' });
  return Response.json({ formats: clean.value });
}
