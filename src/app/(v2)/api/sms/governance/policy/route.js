// Skylog V2.0 — F3, Fase 1. Política y objetivos de seguridad operacional.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, policyText, scope, effectiveDate, sign } = body;
  if (!organizationId || !policyText || !scope || !effectiveDate) {
    return Response.json({ error: 'organizationId, policyText, scope y effectiveDate son requeridos' }, { status: 400 });
  }

  // Compromisos: lista de frases cortas, se limpian (sin vacíos), se recortan y se limita el número.
  const commitments = Array.isArray(body.commitments)
    ? body.commitments.map((c) => String(c || '').trim()).filter(Boolean).slice(0, 20).map((c) => c.slice(0, 300))
    : [];

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'V3')) {
    return Response.json({ error: 'Solo un gestor puede publicar la política SMS' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('sms_policies')
    .insert({
      organization_id: organizationId,
      policy_text: policyText,
      scope,
      commitments,
      effective_date: effectiveDate,
      signed_by: sign ? personId : null,
      signed_at: sign ? new Date().toISOString() : null,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return dbError(error, 'sms/governance/policy');
  return Response.json({ policy: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { policyId, organizationId } = body;
  if (!policyId || !organizationId) return Response.json({ error: 'policyId y organizationId son requeridos' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'V3')) {
    return Response.json({ error: 'Solo un gestor puede editar la política SMS' }, { status: 403 });
  }

  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const updates = {};
  if (has('policyText')) {
    const t = String(body.policyText || '').trim();
    if (!t) return Response.json({ error: 'El texto de la política no puede quedar vacío' }, { status: 400 });
    updates.policy_text = t;
  }
  if (has('scope')) {
    const s = String(body.scope || '').trim();
    if (!s) return Response.json({ error: 'El alcance no puede quedar vacío' }, { status: 400 });
    updates.scope = s;
  }
  if (has('effectiveDate') && body.effectiveDate) updates.effective_date = body.effectiveDate;
  if (has('commitments')) {
    updates.commitments = Array.isArray(body.commitments)
      ? body.commitments.map((c) => String(c || '').trim()).filter(Boolean).slice(0, 20).map((c) => c.slice(0, 300))
      : [];
  }
  if (Object.keys(updates).length === 0) return Response.json({ error: 'No hay cambios para guardar' }, { status: 400 });

  const { data, error } = await supabase
    .from('sms_policies')
    .update(updates)
    .eq('id', policyId)
    .eq('organization_id', organizationId)
    .select()
    .single();
  if (error) return dbError(error, 'sms/governance/policy');
  if (!data) return Response.json({ error: 'Política no encontrada' }, { status: 404 });
  return Response.json({ policy: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('sms_policies')
    .select('*')
    .eq('organization_id', organizationId)
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return dbError(error, 'sms/governance/policy');
  return Response.json({ policies: data, current: (data || []).find((p) => p.signed_at) || null });
}
