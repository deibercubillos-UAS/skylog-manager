import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission, labelForRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const displayName = (p) =>
  p.full_name?.trim()
  || [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  || p.email
  || 'Sin nombre';

// GET /api/manuals/[id]/acknowledgments — roster de acuse de la versión vigente (managers)
export async function GET(_req, { params }) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!hasPermission(role, 'canManageManuals')) {
      return NextResponse.json({ error: 'Sin permiso para ver el seguimiento de lectura.' }, { status: 403 });
    }

    // Verificar pertenencia + versión vigente (user-scoped → RLS por org)
    const { data: manual } = await supabase
      .from('company_manuals')
      .select('id, title, current_version, current_version_id')
      .eq('id', params.id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (!manual) return NextResponse.json({ error: 'Manual no encontrado' }, { status: 404 });

    const admin = createAdminClient();

    // Todos los miembros de la org (conteo confiable vía service role)
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, role')
      .eq('organization_id', orgId);

    // Acuses de la versión vigente
    let ackMap = new Map();
    if (manual.current_version_id) {
      const { data: acks } = await admin
        .from('manual_acknowledgments')
        .select('profile_id, acknowledged_at')
        .eq('version_id', manual.current_version_id);
      ackMap = new Map((acks || []).map(a => [a.profile_id, a.acknowledged_at]));
    }

    const members = (profiles || [])
      .map(p => ({
        profile_id:      p.id,
        name:            displayName(p),
        role:            labelForRole(p.role),
        acknowledged_at: ackMap.get(p.id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const read = members.filter(m => m.acknowledged_at).length;

    return NextResponse.json({
      manualId:   manual.id,
      title:      manual.title,
      version:    manual.current_version,
      versionId:  manual.current_version_id,
      read,
      total:      members.length,
      members,
    });
  } catch (err) {
    console.error('[manuals/acknowledgments GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
