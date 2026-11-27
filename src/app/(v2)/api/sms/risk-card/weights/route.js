// Skylog V2.0 — SMS Tarjeta de riesgo: fijar el peso de un paso de lista.
// weight > 0 lo crea/actualiza; weight <= 0 lo elimina. Solo gestor SMS (P2).
// Se identifica el paso por (checklist, position); la lista debe ser de la org.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

export async function PUT(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, checklistId, position, weight } = body;
  if (!organizationId || !checklistId) return Response.json({ error: 'organizationId y checklistId son requeridos' }, { status: 400 });

  const pos = Number(position);
  if (!Number.isInteger(pos) || pos < 0) return Response.json({ error: 'position inválida' }, { status: 400 });
  const w = Number(weight);
  if (!Number.isFinite(w) || !Number.isInteger(w)) return Response.json({ error: 'weight debe ser un entero' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede configurar la tarjeta de riesgo' }, { status: 403 });
  }

  // La lista debe pertenecer a la organización.
  const { data: checklist, error: checklistError } = await supabase.from('checklists').select('id').eq('id', checklistId).eq('organization_id', organizationId).maybeSingle();
  if (checklistError) return Response.json({ error: 'Error verificando la lista' }, { status: 500 });
  if (!checklist) return Response.json({ error: 'La lista no pertenece a esta organización' }, { status: 400 });

  if (w <= 0) {
    const { error } = await supabase.from('risk_card_weights').delete().eq('checklist_id', checklistId).eq('position', pos);
    if (error) return dbError(error, 'sms/risk-card/weights');
    return Response.json({ ok: true, removed: true });
  }

  const { data, error } = await supabase
    .from('risk_card_weights')
    .upsert(
      { organization_id: organizationId, checklist_id: checklistId, position: pos, weight: w, updated_by: personId, updated_at: new Date().toISOString() },
      { onConflict: 'checklist_id,position' },
    )
    .select('checklist_id, position, weight')
    .single();
  if (error) return dbError(error, 'sms/risk-card/weights');
  return Response.json({ weight: data });
}
