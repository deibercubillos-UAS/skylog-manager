// Skylog V2.0 — contactos de emergencia de la ORGANIZACIÓN (plan de respuesta ante emergencias, RAC 219
// §219.105(a)(4)): a quién llamar. Los ve cualquier miembro (en una emergencia los necesita el piloto); los
// edita un gestor. La RLS de `organization_emergency_contacts` es la barrera; aquí se validan y acotan los campos.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

async function session() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, memberships };
}

const clean = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

export async function GET(request) {
  const s = await session();
  if (s.error) return s.error;
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId || !(s.memberships || []).some((m) => m.organization_id === organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }
  const { data, error } = await s.supabase.from('organization_emergency_contacts').select('*').eq('organization_id', organizationId).order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ contacts: data || [], canEdit: isDutyManager(s.memberships, organizationId) });
}

export async function POST(request) {
  const s = await session();
  if (s.error) return s.error;
  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId || !isDutyManager(s.memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede editar los contactos de emergencia' }, { status: 403 });
  const name = clean(body.name, 150);
  if (!name) return Response.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  const phone = clean(body.phone, 60);
  const email = clean(body.email, 150);
  if (!phone && !email) return Response.json({ error: 'Indica un teléfono o un correo' }, { status: 400 });
  const { data, error } = await s.supabase
    .from('organization_emergency_contacts')
    .insert({ organization_id: organizationId, name, role: clean(body.role, 100), phone, email, notes: clean(body.notes, 500) })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ contact: data });
}

export async function DELETE(request) {
  const s = await session();
  if (s.error) return s.error;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });
  const { data, error } = await s.supabase.from('organization_emergency_contacts').delete().eq('id', id).select('id');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data?.length) return Response.json({ error: 'No se encontró el contacto o no tienes permiso' }, { status: 404 });
  return Response.json({ ok: true });
}
