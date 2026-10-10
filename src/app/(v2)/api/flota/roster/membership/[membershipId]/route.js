// Skylog V2.0 — Tripulación. Cambiar el rol o cerrar una Membresía. Cerrar
// NUNCA borra la Persona ni su historia (30-entidades.md §2, punto 3) —
// solo pone `status='cerrada'` y `ended_at`, dejando el vínculo pasado
// consultable. Solo un gestor de esa organización puntual (no de una
// organización compartida cualquiera, a diferencia de editar los datos de
// la Persona) puede tocar rol/estado de la membresía — es un dato de esa
// organización, no de la persona.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const ASSIGNABLE_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'];

export async function PATCH(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { membershipId } = await params;
  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin.from('memberships').select('organization_id, status').eq('id', membershipId).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando la membresía' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Membresía no encontrada' }, { status: 404 });
  if (existing.status === 'cerrada') return Response.json({ error: 'Esta membresía ya está cerrada' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor de esta organización puede editar la membresía' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const patch = {};
  if (body.role !== undefined) {
    if (!ASSIGNABLE_ROLES.includes(body.role)) return Response.json({ error: 'role debe ser uno de: ' + ASSIGNABLE_ROLES.join(', ') }, { status: 400 });
    patch.role = body.role;
  }
  if (body.close) {
    patch.status = 'cerrada';
    patch.ended_at = new Date().toISOString();
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

  const { data, error } = await admin
    .from('memberships')
    .update(patch)
    .eq('id', membershipId)
    .select('id, role, status, started_at, person:person_id(id, full_name, document_type, document_number, phone, email, license_number, medical_cert_expiry)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ membership: data });
}
