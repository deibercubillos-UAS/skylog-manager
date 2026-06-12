import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';

export const dynamic = 'force-dynamic';

// Resuelve la versión vigente del manual (con filtro de org vía RLS).
async function getCurrentVersion(supabase, manualId, orgId) {
  const { data } = await supabase
    .from('company_manuals')
    .select('id, current_version_id')
    .eq('id', manualId)
    .eq('organization_id', orgId)
    .maybeSingle();
  return data ?? null;
}

// POST /api/manuals/[id]/acknowledge — el usuario confirma que leyó la versión vigente
export async function POST(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canViewManuals')) {
      return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 });
    }

    const manual = await getCurrentVersion(supabase, params.id, orgId);
    if (!manual) return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 });
    if (!manual.current_version_id) {
      return NextResponse.json({ error: 'El manual no tiene una versión vigente.' }, { status: 400 });
    }

    // Idempotente: un acuse por usuario por versión (UNIQUE version_id, profile_id)
    const { error } = await supabase
      .from('manual_acknowledgments')
      .upsert({
        manual_id:       params.id,
        version_id:      manual.current_version_id,
        organization_id: orgId,
        profile_id:      user.id,
      }, { onConflict: 'version_id,profile_id', ignoreDuplicates: true });
    if (error) throw error;

    return NextResponse.json({ acknowledged: true, versionId: manual.current_version_id });
  } catch (err) {
    console.error('[manuals/acknowledge POST]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/manuals/[id]/acknowledge — el usuario retira su acuse de la versión vigente
export async function DELETE(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canViewManuals')) {
      return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 });
    }

    const manual = await getCurrentVersion(supabase, params.id, orgId);
    if (!manual?.current_version_id) return NextResponse.json({ acknowledged: false });

    const { error } = await supabase
      .from('manual_acknowledgments')
      .delete()
      .eq('version_id', manual.current_version_id)
      .eq('profile_id', user.id);
    if (error) throw error;

    return NextResponse.json({ acknowledged: false, versionId: manual.current_version_id });
  } catch (err) {
    console.error('[manuals/acknowledge DELETE]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
