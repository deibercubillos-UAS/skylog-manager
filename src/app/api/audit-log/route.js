import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { hasPermission } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-log?limit=&format=csv
 *
 * Lista el registro de acciones de la organización (Fase 5.a). Solo managers
 * (canViewAudit). Acotado a la org por RLS + filtro explícito. `format=csv`
 * devuelve un CSV descargable.
 */
export async function GET(request) {
  try {
    const supabase = await createClientSSR();
    const { orgId, role } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!hasPermission(role, 'canViewAudit')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const sp = new URL(request.url).searchParams;
    const limit = Math.min(parseInt(sp.get('limit') || '200', 10) || 200, 1000);
    const format = sp.get('format');

    const { data, error } = await supabase
      .from('audit_log')
      .select('id, actor_name, action, module, entity_label, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Si la tabla aún no existe (migración sin aplicar), degradar a lista vacía
    // en vez de romper la página.
    if (error) return NextResponse.json({ entries: [], pending: true });

    if (format === 'csv') {
      const header = 'Fecha,Usuario,Accion,Modulo,Detalle\n';
      const rows = (data || []).map(e =>
        [e.created_at, e.actor_name || '', e.action, e.module, (e.entity_label || '').replace(/"/g, '""')]
          .map(v => `"${v}"`).join(',')
      ).join('\n');
      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="auditoria.csv"',
        },
      });
    }

    return NextResponse.json({ entries: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
