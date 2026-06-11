import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';
import { MANUALS_BUCKET } from '@/lib/manualStorage';

export const dynamic = 'force-dynamic';

// GET /api/manuals/[id]/download[?versionId=XXX]
// Devuelve una signed URL (1h) para descargar el manual. Todos los miembros.
// Sin versionId → versión vigente. Con versionId → esa versión específica del historial.
export async function GET(request, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canViewManuals')) {
      return NextResponse.json({ error: 'Sin permiso para ver manuales.' }, { status: 403 });
    }

    const versionId = new URL(request.url).searchParams.get('versionId');
    let filePath = null;

    if (versionId) {
      const { data: ver } = await supabase
        .from('manual_versions')
        .select('file_path')
        .eq('id', versionId)
        .eq('manual_id', params.id)
        .eq('organization_id', orgId)
        .maybeSingle();
      filePath = ver?.file_path ?? null;
    } else {
      const { data: manual } = await supabase
        .from('company_manuals')
        .select('current_file_path')
        .eq('id', params.id)
        .eq('organization_id', orgId)
        .maybeSingle();
      filePath = manual?.current_file_path ?? null;
    }

    if (!filePath) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(MANUALS_BUCKET)
      .createSignedUrl(filePath, 3600); // 1 hora
    if (error) throw error;

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (err) {
    console.error('[manuals/[id]/download GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
