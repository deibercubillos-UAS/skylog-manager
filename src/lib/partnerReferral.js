// lib/partnerReferral.js — atribución de venta y comisión a socios (escuelas/asesores).
//
// Regla de negocio:
//  - La comisión la paga BitaFly a la ESCUELA con su % fijo. Si el código vendido
//    es de un asesor hijo de una escuela, se usa el % de la escuela (la escuela
//    organiza internamente el reparto). El referral guarda quién vendió (partner_id).
//  - Comisión RECURRENTE: una fila en referral_commissions por cada pago confirmado,
//    idempotente por ref_payco (índice único en BD).
//
// SIEMPRE invocar dentro de try/catch en el webhook — nunca debe romper la activación.

export async function attributeCommission(supabase, { code, orgId, planKey, billing, amount, refPayco }) {
  if (!code || !orgId) return { skipped: 'sin código u org' };

  const norm = String(code).trim().toUpperCase();

  // 1. Código activo → partner vendedor
  const { data: pc } = await supabase
    .from('partner_codes')
    .select('partner_id, active')
    .eq('code', norm)
    .maybeSingle();
  if (!pc || !pc.active) return { skipped: 'código inválido o inactivo' };

  const { data: seller } = await supabase
    .from('partners')
    .select('id, status, commission_pct, parent_partner_id')
    .eq('id', pc.partner_id)
    .single();
  if (!seller || seller.status !== 'activo') return { skipped: 'socio inactivo' };

  // 2. % a aplicar: el de la escuela si el vendedor es asesor de una escuela
  let pct = Number(seller.commission_pct) || 0;
  if (seller.parent_partner_id) {
    const { data: parent } = await supabase
      .from('partners').select('commission_pct, status').eq('id', seller.parent_partner_id).maybeSingle();
    if (parent && parent.status === 'activo') pct = Number(parent.commission_pct) || pct;
  }

  // 3. referral (1 por org). Crear si no existe; reactivar si estaba cancelada.
  let { data: ref } = await supabase
    .from('referrals').select('id').eq('org_id', orgId).maybeSingle();
  if (!ref) {
    const { data: created, error } = await supabase.from('referrals').insert({
      partner_id: seller.id,
      code:       norm,
      org_id:     orgId,
      plan:       planKey || null,
      billing:    billing || null,
      status:     'activa',
    }).select('id').single();
    if (error) return { error: error.message };
    ref = created;
  } else {
    await supabase.from('referrals').update({ status: 'activa', plan: planKey || null, billing: billing || null }).eq('id', ref.id);
  }

  // 4. Comisión de este ciclo (idempotente por ref_payco)
  const sale = Number(amount) || 0;
  const commission = Math.round((sale * pct) / 100);
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const { error: comErr } = await supabase.from('referral_commissions').insert({
    referral_id:       ref.id,
    period,
    sale_amount:       sale,
    commission_pct:    pct,
    commission_amount: commission,
    status:            'pendiente',
    ref_payco:         refPayco || null,
  });
  // Violación de unique (ref_payco ya registrado) = pago ya atribuido → ok
  if (comErr && !/duplicate|unique/i.test(comErr.message)) return { error: comErr.message };

  return { ok: true, partner_id: seller.id, pct, commission };
}
