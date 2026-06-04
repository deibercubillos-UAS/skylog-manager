import { NextResponse }  from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext }   from '@/lib/apiAuth';
import { PERMISSIONS }     from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/template
 *
 * Descarga la plantilla Excel de configuración inicial (Onboarding Express).
 * Accesible para admin y superadmin de cualquier organización.
 */
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx?.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!PERMISSIONS.canManageFleet.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { generateOnboardingTemplate } = await import('@/lib/onboardingTemplate');
    const buffer = await generateOnboardingTemplate();

    const date = new Date().toISOString().split('T')[0];

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bitafly-Onboarding-${date}.xlsx"`,
        'Cache-Control':       'no-store',
      },
    });
  } catch (err) {
    console.error('[onboarding/template] Error:', err.message);
    return NextResponse.json({ error: 'Error generando la plantilla' }, { status: 500 });
  }
}
