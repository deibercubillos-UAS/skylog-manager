// Activación de plan compartida entre el webhook (server-to-server) y el
// endpoint de verify-on-return (cuando el usuario regresa del pago).
// Ambos caminos deben producir el MISMO efecto y ser idempotentes: si uno
// ya activó el plan, el otro simplemente reescribe los mismos valores.

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
export async function activatePlanForUser(supabase, { userId, planKey, billing, subscriptionId = null, ref = null }) {
  const now       = new Date();
  const expiresAt = new Date(now);
  if (billing === 'annual') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  else expiresAt.setMonth(expiresAt.getMonth() + 1);

  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_plan:       planKey,
      epayco_subscription_id:  subscriptionId,
      epayco_ref:              ref,
      subscription_expires_at: expiresAt.toISOString(),
      updated_at:              now.toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  // Limpiar todos los intents pendientes de este usuario
  await supabase.from('pending_subscriptions').delete().eq('user_id', userId);

  return { planKey, billing, expiresAt: expiresAt.toISOString() };
}
