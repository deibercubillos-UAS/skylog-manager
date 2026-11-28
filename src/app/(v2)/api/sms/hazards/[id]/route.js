// Skylog V2.0 — SMS: eliminar un peligro del catálogo (`hazards`). Borra en
// cascada su evaluación de riesgo (`risk_assessments`) y, de la Matriz de
// peligros, sus controles y avances (`hazard_controls` → `hazard_control_updates`,
// FK on delete cascade). Es destructivo y afecta también a Evaluación de Riesgo,
// por eso solo un gestor SMS (P2) y la UI confirma antes.
//
// `hazards` no tiene política RLS de DELETE (solo select/insert): se valida
// sesión, organización y rol con el cliente del usuario y se borra con la llave
// de servicio (mismo criterio `adminWrites` ya usado en el proyecto). Antes se
// limpian los archivos de evidencia en R2 para no dejarlos huérfanos.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { storageRemove } from '@/lib/storage';
import { dbError } from '@/lib/v2/apiErrors';

// Editar un peligro del catálogo. Campos internos y configurables (regla C):
// descripción, origen y descripción adicional (columna mission_type). Igual que
// el DELETE, `hazards` no tiene RLS de update: se valida sesión/org/rol (P2) con
// el cliente del usuario y se escribe con la llave de servicio.
export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: hazard, error: fetchError } = await supabase.from('hazards').select('id, organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el peligro' }, { status: 500 });
  if (!hazard) return Response.json({ error: 'Peligro no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, hazard.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede editar peligros' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const updates = {};
  if (has('description')) {
    const d = String(body.description || '').trim();
    if (!d) return Response.json({ error: 'La descripción del peligro no puede quedar vacía' }, { status: 400 });
    updates.description = d;
  }
  if (has('source')) updates.source = String(body.source || '').trim() || 'observacion';
  if (has('missionType')) updates.mission_type = String(body.missionType || '').trim() || null;
  if (Object.keys(updates).length === 0) return Response.json({ error: 'No hay cambios para guardar' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from('hazards').update(updates).eq('id', id).eq('organization_id', hazard.organization_id).select().single();
  if (error) return dbError(error, 'sms/hazards');
  return Response.json({ hazard: data });
}

export async function DELETE(request, { params }) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: hazard, error: fetchError } = await supabase.from('hazards').select('id, organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el peligro' }, { status: 500 });
  if (!hazard) return Response.json({ error: 'Peligro no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, hazard.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede eliminar peligros' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Evidencias en R2 de los avances de los controles de este peligro — limpieza
  // best-effort antes del borrado en cascada (que elimina las filas, no los files).
  const { data: evidences } = await admin
    .from('hazard_control_updates')
    .select('evidence_path, control:control_id!inner(hazard_id)')
    .eq('control.hazard_id', id)
    .not('evidence_path', 'is', null);
  const keys = (evidences || []).map((e) => e.evidence_path).filter(Boolean);
  if (keys.length) await storageRemove({ bucket: 'documents', keys }).catch(() => {});

  const { error } = await admin.from('hazards').delete().eq('id', id).eq('organization_id', hazard.organization_id);
  if (error) return dbError(error, 'sms/hazards');
  return Response.json({ ok: true });
}
