// Skylog V2.0 — Proveedores: auditorías realizadas. `responses` jsonb
// keyed por criterion_id: `{value: 'cumple'|'no_cumple'|'no_aplica', notes}`
// — el % de cumplimiento se calcula en el cliente/servidor con
// `computeSupplierAuditScore` (dominio puro), nunca se guarda como columna
// derivada (mismo criterio ya usado en Indicadores SPI/zonas de riesgo).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const supplierId = searchParams.get('supplierId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede ver auditorías de proveedores' }, { status: 403 });
  }

  let query = supabase.from('supplier_audits').select('*').eq('organization_id', organizationId).order('audit_date', { ascending: false });
  if (supplierId) query = query.eq('supplier_id', supplierId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ audits: data || [] });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, supplierId, auditDate, auditorName, responses, overallNotes } = body;
  if (!organizationId || !supplierId || !auditDate || !auditorName?.trim()) {
    return Response.json({ error: 'organizationId, supplierId, auditDate y auditorName son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar auditorías' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('supplier_audits')
    .insert({
      organization_id: organizationId,
      supplier_id: supplierId,
      audit_date: auditDate,
      auditor_name: auditorName.trim(),
      responses: responses || {},
      overall_notes: overallNotes?.trim() || null,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ audit: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, auditDate, auditorName, responses, overallNotes } = body;
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('supplier_audits').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Auditoría no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar auditorías' }, { status: 403 });
  }

  const patch = {};
  if (auditDate != null) patch.audit_date = auditDate;
  if (auditorName != null) patch.auditor_name = auditorName.trim();
  if (responses != null) patch.responses = responses;
  if (overallNotes !== undefined) patch.overall_notes = overallNotes?.trim() || null;

  const { data, error } = await supabase.from('supplier_audits').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ audit: data });
}

export async function DELETE(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('supplier_audits').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Auditoría no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar auditorías' }, { status: 403 });
  }

  const { error } = await supabase.from('supplier_audits').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
