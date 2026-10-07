// Skylog V2.0 — versiones del APK para el superadmin con sesión (Etapa F).
import { requireSuperadmin } from '@/lib/v2/platformAdmin';
import { listReleases, publishRelease } from '@/lib/v2/releases';

export const dynamic = 'force-dynamic';

export async function GET() {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const r = await listReleases(g.admin);
  return Response.json(r.json, { status: r.status });
}

export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const r = await publishRelease(g.admin, await request.json().catch(() => ({})));
  return Response.json(r.json, { status: r.status });
}
