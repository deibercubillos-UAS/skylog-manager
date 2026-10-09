// Skylog V2.0 — POST /api/notificaciones/anuncio — un gestor envía un anuncio a la organización (todos, o solo ciertos
// roles). Solo `admin`, `jefe_pilotos`, `gerente_sms` o `superadmin` de esa organización.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { createNotifications } from '@/lib/v2/notify';
import { checkRateLimit } from '@/lib/rateLimiter';
import { canSendAnnouncement, validateAnnouncement, MANAGER_ROLES, ANNOUNCEMENT_AUDIENCES } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError || !personId) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  const myRoles = (memberships || []).filter((m) => m.organization_id === organizationId).map((m) => m.role);
  if (!canSendAnnouncement(myRoles)) return Response.json({ error: 'Solo un gestor puede enviar anuncios' }, { status: 403 });
  if (!checkRateLimit(`anuncio:${personId}`, { limit: 10, windowMs: 3_600_000 }).allowed) return Response.json({ error: 'Demasiados anuncios en poco tiempo. Intenta más tarde.' }, { status: 429 });

  const check = validateAnnouncement(body);
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });
  const { clean } = check;
  // Sin roles = toda la organización (cualquier miembro activo).
  const roles = clean.roles.length ? clean.roles : [...new Set([...MANAGER_ROLES, ...ANNOUNCEMENT_AUDIENCES])];
  const r = await createNotifications({ organizationId, roles, type: 'anuncio', title: clean.title, body: clean.body, actorPersonId: personId });
  return Response.json({ ok: true, delivered: r.created });
}
