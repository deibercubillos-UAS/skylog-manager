// GET /api/organizacion/importar/plantilla — descarga la plantilla de carga inicial (.xlsx). Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { buildTemplate } from '@/lib/v2/onboardingServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const buffer = await buildTemplate();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-carga-inicial-skylog.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
