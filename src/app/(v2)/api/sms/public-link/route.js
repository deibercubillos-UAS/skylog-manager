// Skylog V2.0 — enlace público de reporte (/reportar/<token>). Lo activan, regeneran o desactivan el Gerente
// SMS y el Gerente General: RAC 219 pide que terceros —socios, contratistas— puedan notificar sin cuenta.
// El token es un identificador no adivinable (144 bits), no una contraseña: quien lo tiene puede ENVIAR un
// reporte, nunca leer nada. `organizations` no tiene política de UPDATE para usuarios, por eso escribe el servidor.
import crypto from 'node:crypto';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';

const ALLOWED_ROLES = ['gerente_sms', 'admin', 'superadmin'];

async function authorize(supabase, organizationId) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  if (!membership || !ALLOWED_ROLES.includes(membership.role)) {
    return { error: Response.json({ error: 'Solo el Gerente SMS o el Gerente General administran el enlace público' }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const auth = await authorize(supabase, organizationId);
  if (auth.error) return auth.error;

  const { data, error } = await supabase.from('organizations').select('sms_public_token').eq('id', organizationId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ token: data?.sms_public_token || null });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const body = await request.json().catch(() => ({}));
  const { organizationId, action } = body;
  if (!organizationId || !['enable', 'regenerate', 'disable'].includes(action)) {
    return Response.json({ error: "organizationId y action ('enable' | 'regenerate' | 'disable') son requeridos" }, { status: 400 });
  }
  const auth = await authorize(supabase, organizationId);
  if (auth.error) return auth.error;

  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const admin = createAdminClient();
  if (action === 'enable') {
    // Activar no cambia un enlace que ya existe: quien ya lo difundió no debe perderlo por un clic de más.
    const { data: current } = await admin.from('organizations').select('sms_public_token').eq('id', organizationId).maybeSingle();
    if (current?.sms_public_token) return Response.json({ token: current.sms_public_token });
  }

  const token = action === 'disable' ? null : crypto.randomBytes(18).toString('base64url');
  const { error } = await admin.from('organizations').update({ sms_public_token: token }).eq('id', organizationId);
  if (error) return Response.json({ error: 'No se pudo actualizar el enlace' }, { status: 500 });
  return Response.json({ token });
}
