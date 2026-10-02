// Skylog V2.0 — Tripulación. Editar los datos de una Persona (licencia,
// certificado médico, contacto) — el certificado médico es de la Persona,
// no de la organización (30-entidades.md §2): editarlo aquí lo actualiza
// para TODAS las organizaciones donde esa persona esté vinculada, a
// propósito. Autorizado si es la propia persona (autoservicio) o un gestor
// de CUALQUIER organización que comparta con ella — nunca solo el gestor de
// la organización desde la que se abrió la pantalla, porque el dato es
// compartido entre organizaciones por diseño.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const ALLOWED_FIELDS = ['full_name', 'document_type', 'document_number', 'email', 'phone', 'license_number', 'medical_cert_expiry'];
const FIELD_MAP = {
  fullName: 'full_name',
  documentType: 'document_type',
  documentNumber: 'document_number',
  email: 'email',
  phone: 'phone',
  licenseNumber: 'license_number',
  medicalCertExpiry: 'medical_cert_expiry',
};

export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { personId } = await params;
  const { error: resolveError, personId: callerId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const admin = createAdminClient();
  const isSelf = callerId === personId;

  if (!isSelf) {
    const { data: targetMemberships, error: targetError } = await admin
      .from('memberships')
      .select('organization_id')
      .eq('person_id', personId)
      .eq('status', 'activa');
    if (targetError) return Response.json({ error: 'Error verificando la membresía' }, { status: 500 });

    const sharesManagedOrg = (targetMemberships || []).some((m) => isDutyManager(memberships, m.organization_id));
    if (!sharesManagedOrg) {
      return Response.json({ error: 'Solo la propia persona o un gestor de una organización compartida puede editar este perfil' }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const patch = {};
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    if (body[key] !== undefined && ALLOWED_FIELDS.includes(column)) patch[column] = body[key] || null;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

  const { data, error } = await admin.from('people').update(patch).eq('id', personId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ person: data });
}
