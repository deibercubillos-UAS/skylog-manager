// Skylog V2.0 — consulta previa de «unirme a una empresa» (Etapa B): ¿existe una organización con ese NIT y qué
// roles están disponibles? Endpoint PÚBLICO sin sesión: revela el nombre de la organización si el NIT acierta, por eso
// se limita a 30 consultas por minuto por conexión (acota la enumeración por NIT). No revela plan ni miembros.
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { loadJoinContext, decideJoin } from '@/lib/v2/joinOrganization';
import { JOINABLE_ROLES } from '@skylog/domain';

export async function GET(request) {
  if (!checkRateLimit(`alta-org:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 }).allowed) {
    return Response.json({ found: false, error: 'Demasiadas consultas. Intenta en un minuto.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ found: false, error: 'Servicio no disponible por ahora.' }, { status: 503 });

  const nit = new URL(request.url).searchParams.get('nit') || '';
  const ctx = await loadJoinContext(createAdminClient(), nit);
  if (!ctx) return Response.json({ found: false });

  const roles = Object.fromEntries(JOINABLE_ROLES.map((r) => [r, decideJoin(ctx, r)]));
  return Response.json({ found: true, companyName: ctx.companyName, roles });
}
