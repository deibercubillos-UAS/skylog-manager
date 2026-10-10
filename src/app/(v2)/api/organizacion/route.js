// Skylog V2.0 — Organización. Datos de la empresa (`organizations`, forma
// mínima de V2: razón social, NIT, domicilio — 30-entidades.md §2.3). Sin
// política de UPDATE en la tabla (solo SELECT para miembros) — la escritura
// pasa por `createAdminClient()` tras verificar `isDutyManager()` a mano,
// mismo patrón ya usado en `/api/sms/*` y `/api/duty/*`.
import { logAudit } from '@/lib/v2/auditLog';
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

  const { data, error } = await supabase.from('organizations').select('*').eq('id', organizationId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'Organización no encontrada' }, { status: 404 });
  await logAudit({ organizationId, action: 'update', module: 'Organización', entityLabel: 'Datos de la organización' });
  return Response.json({ organization: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, companyName, nit, domicile, legalRep, phone, contactEmail, nitType } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede editar los datos de la organización' }, { status: 403 });
  }

  const updates = {};
  if (companyName !== undefined) updates.company_name = companyName;
  if (nit !== undefined) updates.nit = nit;
  if (domicile !== undefined) updates.domicile = domicile;
  if (legalRep !== undefined) updates.legal_rep = legalRep || null;
  if (phone !== undefined) updates.phone = phone || null;
  if (contactEmail !== undefined) updates.contact_email = contactEmail || null;
  if (nitType !== undefined) updates.nit_type = nitType || null;
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Ningún campo editable en el cuerpo de la petición' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('organizations').update(updates).eq('id', organizationId).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ organization: data });
}
