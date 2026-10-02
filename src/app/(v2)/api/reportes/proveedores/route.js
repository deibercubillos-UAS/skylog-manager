// Skylog V2.0 — Reportes: Auditoría de Proveedores — resuelve el "fuera de
// alcance, deliberadamente" documentado en la decisión 125 (Proveedores
// sin export a PDF, porque V2 no tenía todavía infraestructura de
// reportes). % de cumplimiento calculado server-side con el mismo dominio
// puro ya usado en `/proveedores` (`computeSupplierAuditScore`).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { computeSupplierAuditScore } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const supplierId = searchParams.get('supplierId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  const { data: criteria, error: criteriaError } = await supabase.from('supplier_audit_criteria').select('id').eq('organization_id', organizationId);
  if (criteriaError) return Response.json({ error: criteriaError.message }, { status: 500 });
  const criteriaIds = (criteria || []).map((c) => c.id);

  let query = supabase
    .from('supplier_audits')
    .select('id, audit_date, auditor_name, responses, overall_notes, supplier:supplier_id(name, category)')
    .eq('organization_id', organizationId)
    .order('audit_date', { ascending: false });
  if (supplierId) query = query.eq('supplier_id', supplierId);
  if (from) query = query.gte('audit_date', from);
  if (to) query = query.lte('audit_date', to);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (data || []).map((a) => {
    const score = computeSupplierAuditScore(a.responses, criteriaIds);
    return {
      supplier_name: a.supplier?.name || '—',
      supplier_category: a.supplier?.category || '—',
      audit_date: a.audit_date,
      auditor_name: a.auditor_name,
      overall_notes: a.overall_notes,
      percentage: score.percentage,
    };
  });

  return Response.json({ audits: rows });
}
