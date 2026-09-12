// Skylog V2.0 — F3, Fase 1 del asistente de implantación. Designación del
// Gerente de Seguridad Operacional — validada contra la UNIÓN de RAC 100
// §100.545(d) y MAUT-1.0-22-007 §7.2.3 (16-asuntos-complementarios.md §3).
// Reutiliza `designations` (role_type='gerente_sms', ya existía desde el
// modelo de identidad); cierra cualquier designación gerente_sms activa
// previa antes de crear la nueva ("único cargo", §7.2.5.2).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { validateGsoProfile } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, personId: candidatePersonId, profile } = body;
  if (!organizationId || !candidatePersonId || !profile) {
    return Response.json({ error: 'organizationId, personId y profile son requeridos' }, { status: 400 });
  }

  const validation = validateGsoProfile(profile);
  if (!validation.eligible) {
    return Response.json(
      { error: 'El perfil no cumple los criterios de RAC 100 §100.545(d) + MAUT §7.2.3', missing: validation.missing },
      { status: 400 }
    );
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede designar al Gerente de Seguridad Operacional' }, { status: 403 });
  }

  const { data: candidateMembership, error: candidateError } = await supabase
    .from('memberships')
    .select('id')
    .eq('person_id', candidatePersonId)
    .eq('organization_id', organizationId)
    .eq('status', 'activa')
    .maybeSingle();
  if (candidateError) return Response.json({ error: 'Error verificando al candidato' }, { status: 500 });
  if (!candidateMembership) return Response.json({ error: 'El candidato no tiene membresía activa en esta organización' }, { status: 404 });

  // Cierra cualquier designación gerente_sms activa previa (§7.2.5.2 — cargo
  // único) antes de crear la nueva.
  await supabase
    .from('designations')
    .update({ ended_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .eq('role_type', 'gerente_sms')
    .is('ended_at', null);

  const { data, error } = await supabase
    .from('designations')
    .insert({
      organization_id: organizationId,
      person_id: candidatePersonId,
      role_type: 'gerente_sms',
      profile,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ designation: data });
}

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
    .from('designations')
    .select('*, people(full_name)')
    .eq('organization_id', organizationId)
    .eq('role_type', 'gerente_sms')
    .is('ended_at', null)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ designation: data });
}
