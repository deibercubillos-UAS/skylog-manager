// Skylog V2.0 — atribución de venta y comisión a socios (Etapa E3). Equivalente de `lib/partnerReferral.js` (v1).
//
// Regla de negocio:
//  - La comisión la paga BitaFly a la ESCUELA con su % fijo. Si el código vendido es de un asesor de una escuela
//    ACTIVA, se usa el % de la escuela (la escuela reparte internamente). El referral guarda quién vendió.
//  - Comisión RECURRENTE: una fila por cada pago confirmado, idempotente por la referencia de pago (UNIQUE en BD).
//
// SIEMPRE se invoca dentro de try/catch: atribuir una comisión nunca puede romper la activación de un plan.
import { normalizeCode, effectiveCommissionPct, commissionAmount, commissionPeriod } from '@skylog/domain';

/** Código de socio válido y activo → { partner } o null. */
export async function findActiveCode(admin, rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const { data: pc } = await admin.from('partner_codes').select('partner_id, active, partner:partners(id, status, commission_pct, parent_partner_id)').eq('code', code).maybeSingle();
  if (!pc || !pc.active || pc.partner?.status !== 'activo') return null;
  return { code, partner: pc.partner };
}

/** Deja la organización vinculada al socio dueño del código (1 referido por organización). Nunca pisa uno existente. */
export async function linkReferral(admin, { organizationId, rawCode, plan = null, billing = null }) {
  const found = await findActiveCode(admin, rawCode);
  if (!found) return { skipped: 'código inválido o inactivo' };
  const { data: existing } = await admin.from('referrals').select('id').eq('organization_id', organizationId).maybeSingle();
  if (existing) return { skipped: 'ya tiene referido', referralId: existing.id };
  const { data, error } = await admin.from('referrals').insert({ partner_id: found.partner.id, code: found.code, organization_id: organizationId, plan, billing, status: 'activa' }).select('id').single();
  if (error) return { error: error.message };
  return { ok: true, referralId: data.id };
}

/**
 * Registra la comisión de UN pago. `explicitCode` (el que se escribió al pagar) tiene prioridad; si no hay, se usa el
 * del referido de la organización (así los cobros recurrentes siguen comisionando sin volver a pedir el código).
 */
export async function attributeCommission(admin, { organizationId, explicitCode, plan, billing, amount, paymentReference }) {
  if (!organizationId || !paymentReference) return { skipped: 'faltan datos' };

  const { data: existing } = await admin.from('referrals').select('id, code, partner_id, status').eq('organization_id', organizationId).maybeSingle();
  const found = await findActiveCode(admin, explicitCode || existing?.code);
  if (!found) return { skipped: 'sin código activo' };

  let parent = null;
  if (found.partner.parent_partner_id) {
    const { data } = await admin.from('partners').select('commission_pct, status').eq('id', found.partner.parent_partner_id).maybeSingle();
    parent = data;
  }
  const pct = effectiveCommissionPct(found.partner, parent);

  let referralId = existing?.id;
  if (!referralId) {
    const created = await linkReferral(admin, { organizationId, rawCode: found.code, plan, billing });
    if (created.error) return { error: created.error };
    referralId = created.referralId;
  } else {
    // Un referido cancelado vuelve a activarse con un pago nuevo.
    await admin.from('referrals').update({ status: 'activa', plan: plan || null, billing: billing || null }).eq('id', referralId);
  }

  const sale = Number(amount) || 0;
  const { error } = await admin.from('referral_commissions').insert({
    referral_id: referralId,
    period: commissionPeriod(),
    sale_amount: sale,
    commission_pct: pct,
    commission_amount: commissionAmount(sale, pct),
    status: 'pendiente',
    payment_reference: String(paymentReference),
  });
  // Violación de unique (referencia ya registrada) = pago ya atribuido → ok.
  if (error && !/duplicate|unique/i.test(error.message)) return { error: error.message };
  return { ok: true, pct, partnerId: found.partner.id };
}
