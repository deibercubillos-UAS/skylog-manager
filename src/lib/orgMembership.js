// Fase 6 del refactor multi-organización: además de escribir en `profiles`
// (que el trigger-puente de la Fase 0 sigue espejando por respaldo), cada
// sitio legacy llama esto para escribir `organization_members` explícitamente
// — mismo efecto que el trigger, pero ya no depende de él. Solo se incluyen
// las columnas realmente pasadas: en un `UPDATE` de un campo (ej. solo
// `role`) no se pisan los demás con `undefined`/null.
export async function syncOrgMembership(client, {
  userId,
  organizationId,
  role,
  subscriptionPlan,
  epaycoCustomerId,
  epaycoSubscriptionId,
  epaycoRef,
  subscriptionExpiresAt,
  subscriptionStatus,
  lastPaymentDate,
}) {
  if (!userId || !organizationId) return;

  const patch = { user_id: userId, organization_id: organizationId };
  if (role !== undefined) patch.role = role;
  if (subscriptionPlan !== undefined) patch.subscription_plan = subscriptionPlan;
  if (epaycoCustomerId !== undefined) patch.epayco_customer_id = epaycoCustomerId;
  if (epaycoSubscriptionId !== undefined) patch.epayco_subscription_id = epaycoSubscriptionId;
  if (epaycoRef !== undefined) patch.epayco_ref = epaycoRef;
  if (subscriptionExpiresAt !== undefined) patch.subscription_expires_at = subscriptionExpiresAt;
  if (subscriptionStatus !== undefined) patch.subscription_status = subscriptionStatus;
  if (lastPaymentDate !== undefined) patch.last_payment_date = lastPaymentDate;

  const { error } = await client
    .from('organization_members')
    .upsert(patch, { onConflict: 'user_id,organization_id' });
  if (error) console.warn('[syncOrgMembership]', error.message);
}
