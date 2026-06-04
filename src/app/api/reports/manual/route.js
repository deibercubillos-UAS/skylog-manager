import { NextResponse }                        from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext }                       from '@/lib/apiAuth';
import { PERMISSIONS }                         from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/manual?chapter=5
 *
 * Genera y descarga el capítulo correspondiente del Manual de Operaciones RAC 100
 * en formato Word (.docx), pre-llenado con los datos reales de la organización.
 *
 * Chapters disponibles:
 *   5 → Procedimientos Operacionales (implementado)
 *   om-operaciones → OM Operaciones (pendiente)
 *   om-sms         → OM SMS (pendiente)
 *
 * Requiere rol: admin | jefe_pilotos (PERMISSIONS.canManageFleet)
 */
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx?.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!PERMISSIONS.canManageFleet.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos — requiere admin o jefe_pilotos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter') || '5';

    // Validar capítulo solicitado
    const AVAILABLE = ['5'];
    if (!AVAILABLE.includes(chapter)) {
      return NextResponse.json(
        { error: `Capítulo "${chapter}" no disponible aún. Disponibles: ${AVAILABLE.join(', ')}` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Cargar datos en paralelo
    const [orgRes, aircraftRes, pilotsRes] = await Promise.all([
      admin
        .from('organizations')
        .select('company_name,tax_id,tax_id_type,dan_number,legal_rep,address,phone,operator_email,logo_url,slug')
        .eq('id', ctx.orgId)
        .single(),
      admin
        .from('aircraft')
        .select('brand,model,serial_number,ruas,total_hours,status')
        .eq('organization_id', ctx.orgId)
        .order('brand'),
      admin
        .from('pilots')
        .select('name,license_number,id_number,medical_expiry,pilot_role,phone')
        .eq('organization_id', ctx.orgId)
        .eq('is_active', true)
        .order('name'),
    ]);

    if (orgRes.error) throw orgRes.error;

    const org      = orgRes.data;
    const aircraft = aircraftRes.data || [];
    const pilots   = pilotsRes.data  || [];

    // Generación dinámica del Word (evita bundleo en cold start)
    const { generateChapter5 } = await import('@/lib/manualGenerators');
    const buffer = await generateChapter5(org, pilots, aircraft);

    // Nombre de archivo limpio
    const slug     = org.slug || org.company_name?.replace(/\s+/g, '-').toLowerCase() || 'operador';
    const dateStr  = new Date().toISOString().split('T')[0];
    const filename = `MO-Cap${chapter}-${slug}-${dateStr}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    });

  } catch (err) {
    console.error('[manual/route] Error:', err.message);
    return NextResponse.json({ error: 'Error generando el documento' }, { status: 500 });
  }
}
