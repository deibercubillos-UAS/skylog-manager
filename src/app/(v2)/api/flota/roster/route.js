// Skylog V2.0 — Tripulación (Flota & Equipo). Roster de la organización
// sobre `people`/`memberships`, ya construidas desde F5 (30-entidades.md §2:
// Cuenta/Persona/Membresía) — esta es la primera pantalla real de gestión
// sobre esas tablas. GET usa el cliente de sesión (las políticas SELECT de
// compañeros de organización ya existen); POST (alta de un tripulante) usa
// `createAdminClient()` con verificación manual de permiso, mismo patrón que
// el alta automática de baterías (decisión 110) — `people`/`memberships`
// solo tienen SELECT hoy, sin política de escritura (decisión 57: deliberado
// hasta que un flujo de alta real las necesitara).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const ASSIGNABLE_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'];

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  const { data: roster, error } = await supabase
    .from('memberships')
    .select('id, role, status, started_at, person:person_id(id, full_name, document_type, document_number, phone, email, license_number, medical_cert_expiry)')
    .eq('organization_id', organizationId)
    .eq('status', 'activa')
    .order('role', { ascending: true });
  if (error) return Response.json({ error: 'Error consultando la tripulación' }, { status: 500 });

  // Para un gestor: quién ya tiene acceso (cuenta). Quien no lo tiene puede ser invitado por correo (Etapa C).
  // Solo se expone el booleano, nunca los datos de la cuenta.
  const isManager = isDutyManager(memberships, organizationId);
  let withAccess = roster;
  if (isManager && (roster || []).length) {
    const { data: accounts } = await createAdminClient().from('accounts').select('person_id').in('person_id', roster.map((m) => m.person.id));
    const have = new Set((accounts || []).map((a) => a.person_id));
    withAccess = roster.map((m) => ({ ...m, has_account: have.has(m.person.id) }));
  }

  return Response.json({ roster: withAccess, isManager });
}

// POST — agregar un tripulante. Si ya existe una Persona con el mismo
// documento o correo (en CUALQUIER organización — regla del diseño, nunca
// duplicar una Persona, 30-entidades.md §2/E1), se reutiliza y solo se crea
// la Membresía nueva; si no existe, se crea la Persona también.
export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, fullName, documentType, documentNumber, email, phone, licenseNumber, medicalCertExpiry, role } = body;
  if (!organizationId || !fullName || !role) {
    return Response.json({ error: 'organizationId, fullName y role son requeridos' }, { status: 400 });
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return Response.json({ error: 'role debe ser uno de: ' + ASSIGNABLE_ROLES.join(', ') }, { status: 400 });
  }

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede agregar tripulantes' }, { status: 403 });
  }

  const admin = createAdminClient();

  let personId = null;
  if (documentNumber) {
    const { data: existing } = await admin.from('people').select('id').eq('document_number', documentNumber).maybeSingle();
    if (existing) personId = existing.id;
  }
  if (!personId && email) {
    const { data: existing } = await admin.from('people').select('id').eq('email', email).maybeSingle();
    if (existing) personId = existing.id;
  }

  if (!personId) {
    const { data: newPerson, error: personError } = await admin
      .from('people')
      .insert({
        full_name: fullName,
        document_type: documentType || null,
        document_number: documentNumber || null,
        email: email || null,
        phone: phone || null,
        license_number: licenseNumber || null,
        medical_cert_expiry: medicalCertExpiry || null,
      })
      .select('id')
      .single();
    if (personError) return Response.json({ error: personError.message }, { status: 500 });
    personId = newPerson.id;
  }

  const { data: membership, error: membershipError } = await admin
    .from('memberships')
    .insert({ organization_id: organizationId, person_id: personId, role, status: 'activa', started_at: new Date().toISOString() })
    .select('id, role, status, started_at, person:person_id(id, full_name, document_type, document_number, phone, email, license_number, medical_cert_expiry)')
    .single();

  if (membershipError) {
    if (membershipError.code === '23505') {
      return Response.json({ error: 'Esta persona ya es miembro activo de esta organización' }, { status: 409 });
    }
    return Response.json({ error: membershipError.message }, { status: 500 });
  }

  return Response.json({ membership });
}
