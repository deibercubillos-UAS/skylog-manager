// Skylog V2.0 — enlaces públicos de reporte POR TIPO (40b). Un enlace para VOR y otro para MOR; el enlace por
// el que entra define el tipo del reporte. Los activan/regeneran/desactivan el Gerente SMS y el Gerente General.
// El token es un identificador no adivinable (144 bits), no una contraseña: quien lo tiene puede ENVIAR un
// reporte, nunca leer nada. Las escrituras van con service role; la lectura (GET) sigue la RLS de la tabla.
import crypto from 'node:crypto';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { readOnlyBlock } from '@/lib/v2/permissions';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';
import { REPORT_FORM_TYPES } from '@skylog/domain';

const ALLOWED_ROLES = ['gerente_sms', 'admin', 'superadmin'];

async function authorize(supabase, organizationId) {
  const user = await getAuthUser(supabase);
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    return { error: Response.json({ error: 'Solo el Gerente SMS o el Gerente General administran los enlaces públicos' }, { status: 403 }) };
  }
  return { memberships };
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const auth = await authorize(supabase, organizationId);
  if (auth.error) return auth.error;

  const { data, error } = await supabase.from('sms_report_public_links').select('report_type, token, enabled').eq('organization_id', organizationId);
  if (error) return dbError(error, 'sms/public-links');
  const links = {};
  for (const t of REPORT_FORM_TYPES) {
    const row = (data || []).find((r) => r.report_type === t && r.enabled);
    links[t] = row ? { token: row.token } : null;
  }
  return Response.json({ links });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const body = await request.json().catch(() => ({}));
  const { organizationId, type, action } = body;
  if (!organizationId || !REPORT_FORM_TYPES.includes(type) || !['enable', 'regenerate', 'disable'].includes(action)) {
    return Response.json({ error: "organizationId, type ('mor'|'vor') y action ('enable'|'regenerate'|'disable') son requeridos" }, { status: 400 });
  }
  const auth = await authorize(supabase, organizationId);
  if (auth.error) return auth.error;
  const readOnly = readOnlyBlock(auth.memberships, organizationId);
  if (readOnly) return readOnly;
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const admin = createAdminClient();

  // Desactivar borra la fila: el token difundido deja de servir y no se puede reactivar el mismo (como el modelo viejo).
  if (action === 'disable') {
    const { error } = await admin.from('sms_report_public_links').delete().eq('organization_id', organizationId).eq('report_type', type);
    if (error) return Response.json({ error: 'No se pudo desactivar el enlace' }, { status: 500 });
    return Response.json({ token: null });
  }

  // Activar no cambia un token que ya existe: quien ya lo difundió no debe perderlo por un clic de más.
  if (action === 'enable') {
    const { data: current } = await admin.from('sms_report_public_links').select('token').eq('organization_id', organizationId).eq('report_type', type).maybeSingle();
    if (current?.token) return Response.json({ token: current.token });
  }

  const token = crypto.randomBytes(18).toString('base64url');
  const { error } = await admin
    .from('sms_report_public_links')
    .upsert({ organization_id: organizationId, report_type: type, token, enabled: true }, { onConflict: 'organization_id,report_type' });
  if (error) return Response.json({ error: 'No se pudo actualizar el enlace' }, { status: 500 });
  return Response.json({ token });
}
