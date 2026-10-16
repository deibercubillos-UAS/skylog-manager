// Skylog V2.0 — Tripulación. Editar los datos de una Persona (licencia,
// certificado médico, contacto) — el certificado médico es de la Persona,
// no de la organización (30-entidades.md §2): editarlo aquí lo actualiza
// para TODAS las organizaciones donde esa persona esté vinculada, a
// propósito. Autorizado si es la propia persona (autoservicio) o un gestor
// de CUALQUIER organización que comparta con ella — nunca solo el gestor de
// la organización desde la que se abrió la pantalla, porque el dato es
// compartido entre organizaciones por diseño.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

const IDENTITY_FIELDS = ['full_name', 'document_type', 'document_number', 'email'];
const ALLOWED_FIELDS = ['full_name', 'document_type', 'document_number', 'email', 'phone', 'license_number', 'medical_cert_expiry', 'emergency_contact_name', 'emergency_contact_phone'];
const FIELD_MAP = {
  fullName: 'full_name',
  documentType: 'document_type',
  documentNumber: 'document_number',
  email: 'email',
  phone: 'phone',
  licenseNumber: 'license_number',
  medicalCertExpiry: 'medical_cert_expiry',
  emergencyContactName: 'emergency_contact_name',
  emergencyContactPhone: 'emergency_contact_phone',
};

export async function PATCH(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
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

    const sharesManagedOrg = (targetMemberships || []).some((m) => membershipsCanEdit(memberships, m.organization_id, 'K4'));
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

  // Los datos de identidad (correo, documento, nombre) solo los cambia la propia persona, o un gestor cuando esa
  // persona existe únicamente en organizaciones que él gestiona y no tiene cuenta. Cambiar el correo de alguien de otra
  // empresa permitía invitarse a sí mismo y quedarse con su identidad (auditoría 2026-10-16 C3).
  if (!isSelf && IDENTITY_FIELDS.some((c) => c in patch)) {
    const [{ data: history }, { data: account }] = await Promise.all([
      admin.from('memberships').select('organization_id').eq('person_id', personId),
      admin.from('accounts').select('id').eq('person_id', personId).maybeSingle(),
    ]);
    const onlyManagedOrgs = (history || []).every((m) => membershipsCanEdit(memberships, m.organization_id, 'K4'));
    if (account || !onlyManagedOrgs) {
      return Response.json({ error: 'Solo la propia persona puede cambiar su correo, documento o nombre.' }, { status: 403 });
    }
  }

  const { data, error } = await admin.from('people').update(patch).eq('id', personId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ person: data });
}
