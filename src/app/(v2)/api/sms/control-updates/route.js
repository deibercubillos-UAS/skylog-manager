// Skylog V2.0 — SMS Matriz de peligros: registrar un avance de un control.
// La evidencia (archivo) se adjunta luego con /control-updates/[id]/evidence.
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
  const { organizationId, controlId, note, progressPct } = body;
  if (!organizationId || !controlId || !note || !String(note).trim()) {
    return Response.json({ error: 'organizationId, controlId y note son requeridos' }, { status: 400 });
  }
  let pct = null;
  if (progressPct !== undefined && progressPct !== null && String(progressPct).trim() !== '') {
    pct = Number(progressPct);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) return Response.json({ error: 'El avance debe ser un entero entre 0 y 100' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede registrar avances' }, { status: 403 });
  }

  const { data: control, error: controlError } = await supabase.from('hazard_controls').select('id').eq('id', controlId).eq('organization_id', organizationId).maybeSingle();
  if (controlError) return Response.json({ error: 'Error verificando el control' }, { status: 500 });
  if (!control) return Response.json({ error: 'El control no pertenece a esta organización' }, { status: 400 });

  const { data, error } = await supabase
    .from('hazard_control_updates')
    .insert({
      organization_id: organizationId,
      control_id: controlId,
      note: String(note).trim().slice(0, 1000),
      progress_pct: pct,
      created_by: personId,
    })
    .select('id, note, progress_pct, created_at')
    .single();
  if (error) return dbError(error, 'sms/control-updates');
  return Response.json({ update: { ...data, has_evidence: false } });
}
