// Skylog V2.0 — Organización. Certificación AeroCivil (CDO-U + OpSpecs) —
// gobierna qué se puede programar (31-esquema-datos.md §1: "si BVLOS no está
// en allowed_operation_types, el sistema no debe dejar programarlo" —
// esa validación en Programación queda pendiente, esto es solo el registro
// del dato). Sin `opspecs_doc_id`/carga de archivo: V2 no tiene todavía un
// pipeline de storage — se deja fuera en vez de fabricar una subida que no
// funciona. Una fila por organización (upsert por organization_id).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('organization_certifications')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ certification: data });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, cdoNumber, cdoIssuedAt, allowedOperationTypes, allowedVisualContact, expiresAt, danNumber, operatorNumber, registrationExpiry } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede editar la certificación AeroCivil' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organization_certifications')
    .upsert(
      {
        organization_id: organizationId,
        cdo_number: cdoNumber || null,
        cdo_issued_at: cdoIssuedAt || null,
        allowed_operation_types: allowedOperationTypes || [],
        allowed_visual_contact: allowedVisualContact || [],
        expires_at: expiresAt || null,
        // Registro ante la Aerocivil (N.° de explotador, N.° de operador UAS, vigencia): solo se tocan si llegan.
        ...(danNumber !== undefined ? { dan_number: danNumber || null } : {}),
        ...(operatorNumber !== undefined ? { operator_number: operatorNumber || null } : {}),
        ...(registrationExpiry !== undefined ? { registration_expiry: registrationExpiry || null } : {}),
      },
      { onConflict: 'organization_id' }
    )
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ certification: data });
}
