// Skylog V2.0 — F5. Contexto mínimo para la UI de captura: en qué organización(es)
// tiene membresía activa la persona autenticada, y si gestiona tiempos de servicio
// en cada una. Evita que el cliente consulte `memberships`/`accounts` directo.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { permissionsForRole } from '@skylog/domain';
import { getAuthUser } from '@/lib/v2/authUser';

export async function GET() {
  const t0 = Date.now();
  const marks = [];
  const mark = (n) => marks.push(`${n};dur=${Date.now() - t0}`);
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  mark('auth');
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error, personId, memberships, mfaEnabled } = await resolveCurrentPerson(supabase, user.id);
  mark('persona');
  if (error) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  // Segundo factor (TOTP) opcional. El nivel actual (`aal`) viene del token local (sin red). Solo si el usuario
  // activó 2FA (bandera `mfa_enabled`, gratis) y la sesión aún es aal1, se confirma con Auth que el factor sigue
  // verificado y se exige el código. Así el 99 % sin 2FA no llama a Auth, y la bandera desincronizada no bloquea
  // (si ya no hay factor, no se exige). El superadmin tiene su exigencia obligatoria aparte (requireSuperadmin).
  let mfaRequired = false;
  if (mfaEnabled && user.aal !== 'aal2') {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      mfaRequired = (factors?.totp || []).some((f) => f.status === 'verified');
    } catch { mfaRequired = false; }
  }
  mark('mfa');

  if (!personId) {
    return Response.json({ personId: null, organizations: [], mfaRequired });
  }

  // Las tres consultas son independientes: en paralelo (antes iban una tras otra).
  const orgIds = memberships.map((m) => m.organization_id);
  const [{ data: person }, { data: orgs, error: orgsError }, { data: partnerRows }, committeeRes] = await Promise.all([
    // fullName — el shell de nav lo necesita para el menú de cuenta (avatar/nombre).
    supabase.from('people').select('full_name').eq('id', personId).maybeSingle(),
    orgIds.length
      ? supabase.from('organizations').select('id, company_name, logo_url, nit').in('id', orgIds)
      : Promise.resolve({ data: [], error: null }),
    // ¿Es miembro de un socio ACTIVO (escuela/asesor)? Habilita el acceso al panel /socio.
    supabase.from('partner_members').select('partner:partners(status)').eq('person_id', personId),
    // Comités SMS (SRB/SAG) a los que pertenece — habilita el acceso a esas secciones aunque
    // el rol no lo dé por matriz (40a-sms-comites-srb-sag.md). RLS deja ver la propia pertenencia.
    supabase.from('sms_committee_members').select('organization_id, committee').eq('person_id', personId),
  ]);
  mark('resto');
  if (orgsError) return Response.json({ error: 'Error consultando organizaciones' }, { status: 500 });

  // Mapa organización → comités. Blindado: si la tabla aún no existe (migración sin aplicar)
  // o la consulta falla, se degrada a sin comités en vez de romper el contexto de sesión.
  const committeesByOrg = {};
  for (const row of committeeRes?.data || []) {
    (committeesByOrg[row.organization_id] ||= []).push(row.committee);
  }

  const organizations = memberships.map((m) => {
    const org = orgs.find((o) => o.id === m.organization_id);
    return {
      id: m.organization_id,
      role: m.role,
      isDutyManager: ['admin', 'jefe_pilotos', 'gerente_sms', 'superadmin'].includes(m.role),
      // Nivel ('edit' | 'view' | 'none') de cada función de la matriz de permisos para este rol.
      permissions: permissionsForRole(m.role, { independentPilot: !!m.independent, readOnly: !!m.readOnly }),
      independentPilot: !!m.independent,
      // Comités SMS (SRB/SAG) a los que pertenece la persona en esta organización.
      committees: committeesByOrg[m.organization_id] || [],
      // Plan vencido hace más de 7 días: la organización está en solo lectura hasta que pague (subscriptionAccess.js).
      readOnly: !!m.readOnly,
      name: org?.company_name || m.organization_id,
      logoUrl: org?.logo_url || null,
      nit: org?.nit || null,
    };
  });

  const isPartner = (partnerRows || []).some((r) => r.partner?.status === 'activo');

  return Response.json(
    { personId, fullName: person?.full_name || null, organizations, isPartner, mfaRequired },
    { headers: { 'Server-Timing': marks.join(', ') } }
  );
}
