// Skylog V2.0 — Pólizas (RAC 100 §100.535(27)): CRUD de pólizas con vigencia
// y cobertura por aeronave. Solo gestores, lectura incluida (mismo criterio
// que Proveedores) — RLS ya lo exige, y aquí también (gate de rol en la API,
// no solo en la UI/RLS). El estado de vigencia NO se guarda ni se calcula
// aquí: vive en packages/domain/src/insuranceCoverage.js.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { storageRemove } from '@/lib/storage';
import { POLICY_TYPES } from '@skylog/domain';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function withAircraftIds(row) {
  const { insurance_policy_aircraft, ...rest } = row;
  return { ...rest, aircraft_ids: (insurance_policy_aircraft || []).map((r) => r.aircraft_id) };
}

async function authenticate(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { personId, memberships };
}

// Todas las aeronaves deben existir y ser de la organización de la póliza.
async function validateAircraft(supabase, organizationId, aircraftIds) {
  if (aircraftIds.length === 0) return null;
  const { data, error } = await supabase.from('aircraft').select('id').eq('organization_id', organizationId).in('id', aircraftIds);
  if (error) return Response.json({ error: 'Error validando las aeronaves' }, { status: 500 });
  if ((data || []).length !== new Set(aircraftIds).size) {
    return Response.json({ error: 'Alguna aeronave no existe en esta organización' }, { status: 400 });
  }
  return null;
}

async function replaceAircraft(supabase, policyId, aircraftIds) {
  const { error: delError } = await supabase.from('insurance_policy_aircraft').delete().eq('policy_id', policyId);
  if (delError) return delError;
  if (aircraftIds.length === 0) return null;
  const rows = [...new Set(aircraftIds)].map((aircraft_id) => ({ policy_id: policyId, aircraft_id }));
  const { error } = await supabase.from('insurance_policy_aircraft').insert(rows);
  return error || null;
}

function validatePolicyFields({ policyType, startDate, endDate, coveredAmountCop }) {
  if (policyType !== undefined && !POLICY_TYPES.includes(policyType)) return 'policyType inválido';
  if (startDate !== undefined && !DATE_RE.test(startDate)) return 'startDate debe ser YYYY-MM-DD';
  if (endDate !== undefined && !DATE_RE.test(endDate)) return 'endDate debe ser YYYY-MM-DD';
  if (startDate && endDate && endDate < startDate) return 'La vigencia termina antes de empezar';
  if (coveredAmountCop != null && coveredAmountCop !== '' && !(Number(coveredAmountCop) >= 0)) return 'El valor asegurado debe ser un número positivo';
  return null;
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const auth = await authenticate(supabase);
  if (auth.error) return auth.error;

  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  if (!isDutyManager(auth.memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede ver las pólizas' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('insurance_policies')
    .select('*, insurance_policy_aircraft(aircraft_id)')
    .eq('organization_id', organizationId)
    .order('end_date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ policies: (data || []).map(withAircraftIds) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const auth = await authenticate(supabase);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { organizationId, policyType = 'rce', insurer, policyNumber, startDate, endDate, coversAllFleet = true, aircraftIds = [], coveredAmountCop, notes } = body;
  if (!organizationId || !insurer?.trim() || !policyNumber?.trim() || !startDate || !endDate) {
    return Response.json({ error: 'organizationId, insurer, policyNumber, startDate y endDate son requeridos' }, { status: 400 });
  }
  const fieldError = validatePolicyFields({ policyType, startDate, endDate, coveredAmountCop });
  if (fieldError) return Response.json({ error: fieldError }, { status: 400 });
  if (!auth.personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(auth.memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar pólizas' }, { status: 403 });
  }
  if (!coversAllFleet && aircraftIds.length === 0) {
    return Response.json({ error: 'Elige al menos una aeronave, o marca que cubre toda la flota' }, { status: 400 });
  }
  const aircraftError = await validateAircraft(supabase, organizationId, coversAllFleet ? [] : aircraftIds);
  if (aircraftError) return aircraftError;

  const { data: policy, error } = await supabase
    .from('insurance_policies')
    .insert({
      organization_id: organizationId,
      policy_type: policyType,
      insurer: insurer.trim(),
      policy_number: policyNumber.trim(),
      start_date: startDate,
      end_date: endDate,
      covers_all_fleet: !!coversAllFleet,
      covered_amount_cop: coveredAmountCop === '' || coveredAmountCop == null ? null : Number(coveredAmountCop),
      notes: notes?.trim() || null,
      created_by: auth.personId,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya existe una póliza de esa aseguradora con ese número' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!coversAllFleet) {
    const linkError = await replaceAircraft(supabase, policy.id, aircraftIds);
    if (linkError) {
      await supabase.from('insurance_policies').delete().eq('id', policy.id);
      return Response.json({ error: 'No se pudieron enlazar las aeronaves' }, { status: 500 });
    }
  }
  return Response.json({ policy: { ...policy, aircraft_ids: coversAllFleet ? [] : [...new Set(aircraftIds)] } });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const auth = await authenticate(supabase);
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => ({}));
  const { id, policyType, insurer, policyNumber, startDate, endDate, coversAllFleet, aircraftIds, coveredAmountCop, notes, isActive } = body;
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase
    .from('insurance_policies')
    .select('organization_id, start_date, end_date, covers_all_fleet')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Póliza no encontrada' }, { status: 404 });
  if (!isDutyManager(auth.memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar pólizas' }, { status: 403 });
  }

  const fieldError = validatePolicyFields({
    policyType,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    coveredAmountCop,
  });
  if (fieldError) return Response.json({ error: fieldError }, { status: 400 });
  // La validación cruzada debe usar las fechas resultantes, no solo las enviadas.
  if ((startDate ?? existing.start_date) > (endDate ?? existing.end_date)) {
    return Response.json({ error: 'La vigencia termina antes de empezar' }, { status: 400 });
  }

  const finalAll = coversAllFleet ?? existing.covers_all_fleet;
  // Se reemplazan las aeronaves enlazadas solo si cambia la lista o se pasa a/desde "toda la flota".
  const relink = aircraftIds !== undefined || (coversAllFleet !== undefined && coversAllFleet !== existing.covers_all_fleet);
  if (relink) {
    if (!finalAll && (aircraftIds || []).length === 0) {
      return Response.json({ error: 'Elige al menos una aeronave, o marca que cubre toda la flota' }, { status: 400 });
    }
    const aircraftError = await validateAircraft(supabase, existing.organization_id, finalAll ? [] : aircraftIds);
    if (aircraftError) return aircraftError;
  }

  const patch = { updated_at: new Date().toISOString() };
  if (policyType !== undefined) patch.policy_type = policyType;
  if (insurer !== undefined) patch.insurer = insurer.trim();
  if (policyNumber !== undefined) patch.policy_number = policyNumber.trim();
  if (startDate !== undefined) patch.start_date = startDate;
  if (endDate !== undefined) patch.end_date = endDate;
  if (coversAllFleet !== undefined) patch.covers_all_fleet = !!coversAllFleet;
  if (coveredAmountCop !== undefined) patch.covered_amount_cop = coveredAmountCop === '' || coveredAmountCop == null ? null : Number(coveredAmountCop);
  if (notes !== undefined) patch.notes = notes?.trim() || null;
  if (isActive != null) patch.is_active = isActive;

  const { data: policy, error } = await supabase.from('insurance_policies').update(patch).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya existe una póliza de esa aseguradora con ese número' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (relink) {
    const linkError = await replaceAircraft(supabase, id, finalAll ? [] : aircraftIds);
    if (linkError) return Response.json({ error: 'La póliza se actualizó, pero no las aeronaves enlazadas' }, { status: 500 });
  }
  return Response.json({ policy });
}

export async function DELETE(request) {
  const supabase = await createClientSSR();
  const auth = await authenticate(supabase);
  if (auth.error) return auth.error;

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('insurance_policies').select('organization_id, document_path').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return Response.json({ error: 'Póliza no encontrada' }, { status: 404 });
  if (!isDutyManager(auth.memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede eliminar pólizas' }, { status: 403 });
  }

  const { error } = await supabase.from('insurance_policies').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  // Mejor esfuerzo: el registro ya se borró; un archivo huérfano no debe devolver error.
  if (existing.document_path) await storageRemove({ bucket: 'documents', keys: [existing.document_path] });
  return Response.json({ ok: true });
}
