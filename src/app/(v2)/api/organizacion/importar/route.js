// POST /api/organizacion/importar — carga inicial desde Excel (multipart: file, organizationId, dryRun). Solo gestores.
// `dryRun=true` devuelve el informe sin escribir nada; sin él, aplica lo válido y devuelve el mismo informe.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { checkRateLimit } from '@/lib/rateLimiter';
import { logAudit } from '@/lib/v2/auditLog';
import { readWorkbook, runImport } from '@/lib/v2/onboardingServer';
import { adminKeyProblem } from '@/lib/v2/adminKey';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const MAX_BYTES = 4 * 1024 * 1024;
const XLSX_TYPES = new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', '']);

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  if (!checkRateLimit(`import:${user.id}`, { limit: 20, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiadas importaciones seguidas. Intenta en una hora.' }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const organizationId = form.get('organizationId');
  const dryRun = form.get('dryRun') === 'true';
  const file = form.get('file');
  if (!organizationId || !file || typeof file === 'string') return Response.json({ error: 'organizationId y file son requeridos' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'El archivo supera 4 MB' }, { status: 413 });
  if (!/\.xlsx$/i.test(file.name || '') || !XLSX_TYPES.has(file.type)) return Response.json({ error: 'Sube un archivo .xlsx (la plantilla de Skylog)' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede importar datos' }, { status: 403 });

  let sheets;
  try {
    sheets = await readWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch {
    return Response.json({ error: 'No se pudo leer el archivo. Verifica que sea la plantilla .xlsx sin proteger.' }, { status: 400 });
  }
  if (Object.keys(sheets).length === 0) return Response.json({ error: 'No encontré ninguna hoja de la plantilla (Aeronaves, Baterías, Tripulación, Contactos de emergencia, Pólizas).' }, { status: 400 });

  const report = await runImport({ admin: createAdminClient(), organizationId, personId, memberships, sheets, dryRun });
  if (!dryRun) {
    const created = Object.entries(report).filter(([, r]) => r.created > 0).map(([k, r]) => `${k}: ${r.created}`).join(', ');
    if (created) await logAudit({ organizationId, action: 'create', module: 'Importación', entityLabel: `Carga inicial desde Excel — ${created}` });
  }
  return Response.json({ dryRun, report });
}
