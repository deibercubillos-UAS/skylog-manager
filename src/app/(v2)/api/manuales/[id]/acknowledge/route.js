// Skylog V2.0 — Manuales: confirmar/retirar lectura de la versión vigente.
// Idempotente (upsert por version_id+person_id, UNIQUE en BD).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

async function loadManual(supabase, id) {
  return supabase.from('manuales').select('id, organization_id, current_version_id').eq('id', id).maybeSingle();
}

export async function POST(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error } = await loadManual(supabase, id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });
  if (!manual.current_version_id) return Response.json({ error: 'Este manual no tiene una versión vigente' }, { status: 400 });

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!organizationIds.includes(manual.organization_id)) return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });

  const { error: ackError } = await supabase
    .from('manual_acknowledgments')
    .upsert(
      {
        manual_id: manual.id,
        version_id: manual.current_version_id,
        organization_id: manual.organization_id,
        person_id: personId,
      },
      { onConflict: 'version_id,person_id' }
    );
  if (ackError) return Response.json({ error: ackError.message }, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error } = await loadManual(supabase, id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId || !manual.current_version_id) return Response.json({ ok: true });

  const { error: delError } = await supabase
    .from('manual_acknowledgments')
    .delete()
    .eq('version_id', manual.current_version_id)
    .eq('person_id', personId);
  if (delError) return Response.json({ error: delError.message }, { status: 500 });

  return Response.json({ ok: true });
}
