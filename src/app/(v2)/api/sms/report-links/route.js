// Skylog V2.0 — estado de los enlaces públicos de reporte (MOR/VOR) para CUALQUIER miembro de la organización.
// A diferencia de /api/sms/public-links (que administran solo los gestores), este GET es de solo lectura y lo usa
// la barra inferior: al elegir MOR o VOR necesita saber qué tipo tiene un enlace activo y su token para redirigir
// a /reportar/<token>. La RLS de sms_report_public_links solo deja leer a los gestores, así que se lee con el
// cliente admin DESPUÉS de confirmar la pertenencia del usuario a la organización. El token no es una contraseña
// (144 bits, no adivinable): quien lo tiene solo puede ENVIAR un reporte, nunca leer; exponerlo a un miembro
// autenticado (que de todos modos puede reportar) es de bajo riesgo.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';
import { REPORT_FORM_TYPES } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  if (!membership) return Response.json({ error: 'Sin acceso a esta organización' }, { status: 403 });

  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from('sms_report_public_links')
    .select('report_type, token, enabled')
    .eq('organization_id', organizationId);
  if (dbErr) return dbError(dbErr, 'sms/report-links');

  const links = {};
  for (const t of REPORT_FORM_TYPES) {
    const row = (data || []).find((r) => r.report_type === t && r.enabled);
    links[t] = row ? { token: row.token } : null;
  }
  return Response.json({ links });
}
