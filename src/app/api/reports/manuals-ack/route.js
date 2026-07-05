import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Consolidado de confirmación de lectura — estado leído/pendiente de TODOS
// los manuales vigentes de la org sobre su versión actual, en una sola
// tabla (a diferencia del "Acta PDF" existente en /dashboard/manuales, que
// es por manual específico con el roster completo). Snapshot, sin rango de
// fechas — decisión confirmada con el usuario. Ver CLAUDE.md "Manuales".
export async function GET() {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        const { data: manuals, error } = await supabase
            .from('company_manuals')
            .select('id, title, category, current_version, current_effective_date, current_version_id')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .order('category');
        if (error) throw error;

        // Regla de conteo: service role + .select('id') + .length, nunca
        // count:'exact',head:true (PostgREST puede ignorar filtros RLS).
        const adminSupabase = createAdminClient();
        const { data: members } = await adminSupabase.from('profiles').select('id').eq('organization_id', orgId);
        const total = (members || []).length;

        const versionIds = (manuals || []).map(m => m.current_version_id).filter(Boolean);
        const { data: acks } = versionIds.length
            ? await supabase.from('manual_acknowledgments').select('version_id').in('version_id', versionIds)
            : { data: [] };
        const readByVersion = {};
        (acks || []).forEach(a => { readByVersion[a.version_id] = (readByVersion[a.version_id] || 0) + 1; });

        const rows = (manuals || []).map(m => {
            const read = m.current_version_id ? (readByVersion[m.current_version_id] || 0) : 0;
            return {
                title: m.title,
                category: m.category,
                version: m.current_version,
                effective_date: m.current_effective_date,
                total,
                read,
                pending: Math.max(total - read, 0),
                pct: total ? Math.round((read / total) * 100) : null,
            };
        });

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
