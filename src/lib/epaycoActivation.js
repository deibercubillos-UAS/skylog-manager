// Activación de plan compartida entre el webhook (server-to-server) y el
// endpoint de verify-on-return (cuando el usuario regresa del pago).
// Ambos caminos deben producir el MISMO efecto y ser idempotentes: si uno
// ya activó el plan, el otro simplemente reescribe los mismos valores.
import { uniqueSlug } from '@/lib/slugify';
import { syncOrgMembership } from '@/lib/orgMembership';

/**
 * Resuelve planKey/billing para un usuario a partir de su intent más reciente
 * en pending_subscriptions. Es el enlace confiable en el flujo de
 * subscription-landing, donde ePayco no recibe nuestra referencia.
 *
 * @returns {{ planKey: string, billing: string, reference: string } | null}
 */
export async function resolvePendingForUser(supabase, userId) {
  const { data } = await supabase
    .from('pending_subscriptions')
    .select('reference, plan_key, billing')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { planKey: data.plan_key, billing: data.billing, reference: data.reference };
}

/**
 * Activa (o renueva) el plan de un usuario en profiles y limpia sus intents
 * pendientes. Idempotente.
 *
 * @param {object}  supabase  cliente con service role (bypass RLS)
 * @param {object}  opts
 * @param {string}  opts.userId
 * @param {string}  opts.planKey
 * @param {string}  opts.billing            'monthly' | 'annual'
 * @param {string} [opts.subscriptionId]    epayco_subscription_id
 * @param {string} [opts.ref]               epayco_ref (x_ref_payco)
 */
// Planes de pago válidos — cualquier otro valor en planKey es un error
const VALID_PAID_PLANS = ['escuadrilla', 'flota', 'enterprise'];

/**
 * Crea una cuenta completa (org + auth user + profile + piloto) a partir de
 * un registro pendiente de pago, y activa el plan indicado.
 * Llamado desde el webhook de ePayco cuando llega un pago de un nuevo usuario.
 *
 * @param {object} supabase  cliente con service_role
 * @param {string} email     email del nuevo usuario (para buscar el pending)
 * @param {object} paymentData  {planKey, billing, subscriptionId, ref}
 * @returns {string|null} userId creado, o null si no había pending
 */
export async function createAccountFromPendingRegistration(supabase, email, paymentData) {
  // 1. Buscar pending_registration activo para este email
  const { data: pending } = await supabase
    .from('pending_registrations')
    .select('*')
    .ilike('email', email.trim())
    .is('completed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return null;

  // 2. Verificar que no exista ya un perfil con ese email (idempotencia)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email.trim())
    .maybeSingle();

  if (existingProfile) {
    // Ya existe: marcar como completado y activar plan sobre la cuenta existente
    await supabase.from('pending_registrations')
      .update({ completed_at: new Date().toISOString(), completed_user_id: existingProfile.id })
      .eq('id', pending.id);
    return existingProfile.id;
  }

  const d = pending.reg_data;
  const { email: regEmail, password, firstName, lastName, phone, city, type, role, companyName, nit, orgCode } = d;
  const ALLOWED_REGISTRATION_ROLES = ['piloto', 'admin'];
  let normalizedRole = ALLOWED_REGISTRATION_ROLES.includes(role) ? role : 'piloto';
  if (type === 'solo') normalizedRole = 'piloto';

  let targetOrgId = null;

  // 3. Crear organización (misma lógica que /api/auth/register)
  if (type === 'solo' || normalizedRole === 'admin') {
    let uniqueCode;
    if (normalizedRole === 'admin' && nit) {
      uniqueCode = nit.replace(/\s|\./g, '').toUpperCase();
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('unique_code', uniqueCode)
        .maybeSingle();
      if (existingOrg) {
        uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase() + '_DUP';
      }
    } else {
      uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const orgName = type === 'solo' ? `Piloto: ${firstName}` : (companyName || `Org: ${firstName}`);
    const orgSlug = await uniqueSlug(orgName, async (candidate) => {
      const { data } = await supabase.from('organizations').select('id').eq('slug', candidate).maybeSingle();
      return !!data;
    });
    const orgInsert = { company_name: orgName, unique_code: uniqueCode, slug: orgSlug };
    if (normalizedRole === 'admin' && nit) orgInsert.tax_id = nit.replace(/\s|\./g, '');

    const { data: org, error: orgErr } = await supabase.from('organizations').insert([orgInsert]).select().single();
    if (orgErr) throw orgErr;
    targetOrgId = org.id;
  } else if (orgCode) {
    const code = orgCode.replace(/\s|\./g, '').toUpperCase();
    const { data: org } = await supabase.from('organizations').select('id').eq('unique_code', code).maybeSingle();
    if (org) targetOrgId = org.id;
  }

  // 4. Crear auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: regEmail,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, role: normalizedRole, organization_id: targetOrgId },
  });

  if (authErr) {
    // Limpiar org si se creó en este request
    if (targetOrgId) await supabase.from('organizations').delete().eq('id', targetOrgId);
    throw authErr;
  }

  const userId = authData.user.id;
  const planKey = paymentData.planKey || pending.plan_key;
  const billing = paymentData.billing || pending.billing;

  // 5. Crear perfil con plan activado
  const expiresAt = new Date();
  if (billing === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  else expiresAt.setMonth(expiresAt.getMonth() + 1);

  await supabase.from('profiles').upsert({
    id:                      userId,
    email:                   regEmail,
    first_name:              firstName,
    last_name:               lastName,
    full_name:               `${firstName} ${lastName}`.trim(),
    role:                    normalizedRole,
    organization_id:         targetOrgId,
    phone:                   phone || null,
    city:                    city  || null,
    subscription_plan:       planKey,
    epayco_subscription_id:  paymentData.subscriptionId || null,
    epayco_ref:              paymentData.ref || null,
    subscription_expires_at: expiresAt.toISOString(),
  }, { onConflict: 'id' });

  if (targetOrgId) {
    await syncOrgMembership(supabase, {
      userId,
      organizationId: targetOrgId,
      role: normalizedRole,
      subscriptionPlan: planKey,
      epaycoSubscriptionId: paymentData.subscriptionId || null,
      epaycoRef: paymentData.ref || null,
      subscriptionExpiresAt: expiresAt.toISOString(),
    });
  }

  // 6. Auto-crear registro de piloto
  if (targetOrgId) {
    await supabase.from('pilots').insert([{
      organization_id: targetOrgId,
      owner_id:        userId,
      name:            `${firstName} ${lastName}`.trim(),
      email:           regEmail,
      phone:           phone || null,
      pilot_role:      'Piloto',
      is_active:       true,
    }]).catch(() => {}); // no-crítico
  }

  // 7. Marcar pending_registration como completado
  await supabase.from('pending_registrations')
    .update({ completed_at: new Date().toISOString(), completed_user_id: userId })
    .eq('id', pending.id);

  console.log(`[epayco] ✓ Cuenta creada desde pending_registration: user=${userId} plan=${planKey}`);
  return userId;
}

export async function activatePlanForUser(supabase, { userId, planKey, billing, subscriptionId = null, ref = null }) {
  // Validar que planKey sea uno de los planes de pago conocidos
  if (!planKey || !VALID_PAID_PLANS.includes(planKey)) {
    throw new Error(`plan_key inválido o no reconocido: "${planKey}". Valores permitidos: ${VALID_PAID_PLANS.join(', ')}`);
  }

  const now       = new Date();
  const expiresAt = new Date(now);
  if (billing === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  else expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({
      subscription_plan:       planKey,
      epayco_subscription_id:  subscriptionId,
      epayco_ref:              ref,
      subscription_expires_at: expiresAt.toISOString(),
      updated_at:              now.toISOString(),
    })
    .eq('id', userId)
    .select('organization_id')
    .single();

  if (error) throw error;

  if (updated?.organization_id) {
    await syncOrgMembership(supabase, {
      userId,
      organizationId: updated.organization_id,
      subscriptionPlan: planKey,
      epaycoSubscriptionId: subscriptionId,
      epaycoRef: ref,
      subscriptionExpiresAt: expiresAt.toISOString(),
    });
  }

  // Limpiar todos los intents pendientes de este usuario
  await supabase.from('pending_subscriptions').delete().eq('user_id', userId);

  return { planKey, billing, expiresAt: expiresAt.toISOString() };
}
