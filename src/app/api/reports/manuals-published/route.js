import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Historial de publicaciones de manuales (alta inicial + nuevas versiones)
// dentro del periodo — manual_versions es el registro inmutable de cada
// publicación real (ver CLAUDE.md "Manuales de la Empresa"). Para el reporte
// descargable en /dashboard/reports.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canViewAudit.includes(role)) return NextResponse.json({ error: 'Sin permisos para ver reportes' }, { status: 403 });

        let query = supabase
            .from('manual_versions')
            .select('version, effective_date, comments, uploaded_by, manual:manual_id(title, category)')
            .eq('organization_id', orgId)
            .order('effective_date', { ascending: true });
        if (from) query = query.gte('effective_date', from);
        if (to) query = query.lte('effective_date', to);

        const { data: versions, error } = await query;
        if (error) throw error;

        const uploaderIds = [...new Set((versions || []).map(v => v.uploaded_by).filter(Boolean))];
        const { data: uploaders } = uploaderIds.length
            ? await supabase.from('profiles').select('id, full_name').in('id', uploaderIds)
            : { data: [] };
        const nameById = {};
        (uploaders || []).forEach(u => { nameById[u.id] = u.full_name; });

        const rows = (versions || []).map(v => ({
            title: v.manual?.title || '—',
            category: v.manual?.category || '—',
            version: v.version,
            effective_date: v.effective_date,
            uploaded_by: nameById[v.uploaded_by] || '—',
            comments: v.comments || '',
        }));

        return NextResponse.json(rows);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
