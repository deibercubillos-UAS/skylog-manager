// POST /api/epayco/webhook
// GET  /api/epayco/webhook  → ePayco verifica la URL antes de usarla (debe devolver 200)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { activatePlanForUser, resolvePendingForUser, createAccountFromPendingRegistration } from '@/lib/epaycoActivation';
import { attributeCommission } from '@/lib/partnerReferral';

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ePayco hace GET a la URL de confirmación para verificar que existe
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request) {
  try {
    const rawBody   = await request.text();
    const contentType = request.headers.get('content-type') || '';

    // ePayco puede enviar el body como JSON o como form-urlencoded
    let params = {};
    if (contentType.includes('application/json')) {
      try { params = JSON.parse(rawBody); } catch { params = {}; }
    } else {
      try { params = Object.fromEntries(new URLSearchParams(rawBody)); } catch { params = {}; }
      // Si URLSearchParams no encontró nada, intentar JSON como fallback
      if (Object.keys(params).length === 0 && rawBody.trim().startsWith('{')) {
        try { params = JSON.parse(rawBody); } catch { params = {}; }
      }
    }

    // Log diagnóstico (sin PII)
    console.log('[epayco] webhook recibido:', JSON.stringify({
      contentType,
      ref:          params.x_ref_payco,
      state:        params.x_transaction_state,
      amount:       params.x_amount,
      sig_received: (params.x_signature || '').slice(0, 8),
      keys:         Object.keys(params).join(','),
    }));

    // ── Verificación de firma ─────────────────────────────────────────────────
    const custId     = process.env.EPAYCO_P_CUST_ID;
    const privateKey = process.env.EPAYCO_PRIVATE_KEY;

    if (!custId || !privateKey) {
      console.error('EPAYCO_P_CUST_ID o EPAYCO_PRIVATE_KEY no configurados en Vercel');
      return NextResponse.json({ error: 'Webhook no configurado' }, { status: 500 });
    }

    // Firma oficial de ePayco: 6 campos, SIN x_transaction_state.
    // sha256(p_cust_id_cliente ^ p_key ^ x_ref_payco ^ x_transaction_id ^ x_amount ^ x_currency_code)
    const pKey = process.env.EPAYCO_P_KEY || privateKey; // p_key si existe, si no private_key

    const sigRaw = [custId, pKey,
      params.x_ref_payco, params.x_transaction_id,
      params.x_amount, params.x_currency_code,
    ].join('^');

    const expectedSig = crypto.createHash('sha256').update(sigRaw).digest('hex');
    const receivedSig = (params.x_signature || '').toLowerCase();

    if (expectedSig !== receivedSig) {
      // Log diagnóstico: muestra los valores usados para la firma (sin PII)
      console.error('ePayco webhook: firma inválida', {
        custId_len:      custId.length,
        pKey_len:        pKey.length,
        usingPKeyEnv:    !!process.env.EPAYCO_P_KEY,
        expected:        expectedSig,
        received:        receivedSig,
        sigRaw_preview:  `${custId}^[key]^${params.x_ref_payco}^${params.x_transaction_id}^${params.x_amount}^${params.x_currency_code}`,
      });
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    // ── Solo procesar aprobadas ───────────────────────────────────────────────
    if (params.x_transaction_state !== 'Aceptada') {
      return NextResponse.json({ received: true });
    }

    const supabase = makeSupabase();

    // ── Replay protection: solo saltamos si YA se procesó con éxito ──────────
    // El INSERT se hace al final, tras activar el plan. Así un fallo transitorio
    // no bloquea permanentemente un reintento legítimo de ePayco.
    const refPayco = params.x_ref_payco;
    if (refPayco) {
      const { data: already } = await supabase
        .from('processed_webhook_refs')
        .select('ref_payco')
        .eq('ref_payco', refPayco)
        .maybeSingle();
      if (already) {
        console.log(`[epayco] webhook duplicado ignorado: ref=${refPayco}`);
        return NextResponse.json({ received: true });
      }
    }

    // ── 1. Intentar por extras (checkout widget) ──────────────────────────────
    // OJO: en subscription-landing, ePayco rellena x_extra1/2/3 con UIDs internos
    // de su plataforma (NO con nuestros valores). Solo los aceptamos si tienen
    // el formato esperado:
    //  - x_extra1 → plan_key válido
    //  - x_extra2 → billing válido
    //  - x_extra3 → UUID (nuestros user.id son UUID; los UID de ePayco no lo son)
    const VALID_PLAN_KEYS = ['escuadrilla', 'flota', 'enterprise'];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    let planKey = VALID_PLAN_KEYS.includes(params.x_extra1) ? params.x_extra1 : null;
    let billing = ['monthly', 'annual'].includes(params.x_extra2) ? params.x_extra2 : null;
    let userId  = UUID_RE.test(params.x_extra3 || '') ? params.x_extra3 : null;
    let partnerCode = null; // código de socio capturado en el intent (P6/P7)

    // ── 2. Intentar por referencia en pending_subscriptions ──────────────────
    if (!userId) {
      const ref = params.x_id_invoice || params.x_invoice || params.x_description;
      if (ref) {
        const { data: pending } = await supabase
          .from('pending_subscriptions')
          .select('*')
          .eq('reference', ref)
          .single();
        if (pending) {
          planKey = pending.plan_key;
          billing = pending.billing;
          userId  = pending.user_id;
          partnerCode = pending.partner_code || null;
        }
      }
    }

    // ── 3. Fallback por email (case-insensitive) ──────────────────────────────
    // En el flujo subscription-landing ePayco NO recibe nuestra referencia,
    // por lo que el email es el enlace real entre el pago y el usuario.
    if (!userId && params.x_customer_email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', params.x_customer_email.trim())
        .maybeSingle();
      if (profile) userId = profile.id;
    }

    // ── 4. Resolver plan/billing desde el pending más reciente del usuario ─────
    // Más confiable que x_description_plan (que ePayco no siempre envía).
    if (userId && !planKey) {
      const pending = await resolvePendingForUser(supabase, userId);
      if (pending) { planKey = pending.planKey; billing = pending.billing; }
    }

    // ── 5. Último recurso: mapear id_plan/UID de ePayco → planKey/billing ──────
    if (!planKey) {
      // 5a. Por epayco_id (id_plan textual)
      const epaycoIdPlan = params.x_description_plan || params.x_plan_id || params.x_extra4;
      if (epaycoIdPlan) {
        const { data: cfg } = await supabase
          .from('epayco_plan_config')
          .select('plan_key, billing')
          .eq('epayco_id', epaycoIdPlan)
          .maybeSingle();
        if (cfg) { planKey = cfg.plan_key; billing = cfg.billing; }
      }
    }

    if (!planKey) {
      // 5b. Por epayco_uid (el UID que subscription-landing envía en x_extra1)
      const uid = params.x_extra1 || params.x_id_plan || null;
      if (uid) {
        const { data: cfg } = await supabase
          .from('epayco_plan_config')
          .select('plan_key, billing')
          .eq('epayco_uid', uid)
          .maybeSingle();
        if (cfg) { planKey = cfg.plan_key; billing = cfg.billing; }
      }
    }

    // ── 3.5. Nuevo usuario: buscar en pending_registrations por email ────────────
    // Cuando el usuario se registró pero aún no tiene cuenta (pagó antes de crearla)
    if (!userId && params.x_customer_email) {
      const newUserId = await createAccountFromPendingRegistration(supabase, params.x_customer_email, {
        planKey:        planKey || null,
        billing:        billing || 'monthly',
        subscriptionId: params.x_subscription_id || null,
        ref:            params.x_ref_payco || null,
      });
      if (newUserId) {
        console.log(`[epayco] ✓ Cuenta nueva creada desde pending_registration vía webhook: user=${newUserId}`);
        return NextResponse.json({ success: true });
      }
    }

    if (!userId || !planKey) {
      console.error('ePayco webhook: no se pudo identificar usuario/plan. Params:', JSON.stringify(params));
      // 200 para que ePayco no reintente — se registra para revisión manual
      return NextResponse.json({ received: true, warning: 'No se identificó usuario/plan — revisa logs de Vercel' });
    }

    // ── Activar plan (helper compartido, idempotente) ─────────────────────────
    // billing fallback a 'monthly' si los pasos 1-4 no lo resolvieron,
    // para evitar que un plan anual se active con expiración de solo 1 mes (BUG-14)
    await activatePlanForUser(supabase, {
      userId,
      planKey,
      billing:        billing || 'monthly',
      subscriptionId: params.x_subscription_id || null,
      ref:            params.x_ref_payco || null,
    });

    // Marcar como procesado SOLO tras activar con éxito (idempotencia real)
    if (refPayco) {
      await supabase.from('processed_webhook_refs')
        .insert({ ref_payco: refPayco })
        .then(() => {}, () => {}); // ignora violación de unique en carreras
    }

    // ── Atribución de comisión a socio (no crítico — nunca rompe el webhook) ──
    try {
      // Respaldo: si no vino el código por referencia, buscar el pending más reciente del usuario
      if (!partnerCode && userId) {
        const { data: lastPending } = await supabase
          .from('pending_subscriptions')
          .select('partner_code')
          .eq('user_id', userId)
          .not('partner_code', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastPending?.partner_code) partnerCode = lastPending.partner_code;
      }
      if (partnerCode) {
        const { data: prof } = await supabase
          .from('profiles').select('organization_id').eq('id', userId).single();
        if (prof?.organization_id) {
          const result = await attributeCommission(supabase, {
            code:     partnerCode,
            orgId:    prof.organization_id,
            planKey,
            billing:  billing || 'monthly',
            amount:   params.x_amount,
            refPayco,
          });
          console.log('[epayco] atribución socio:', JSON.stringify(result));
        }
      }
    } catch (attrErr) {
      console.error('[epayco] atribución socio falló (no crítico):', attrErr.message);
    }

    // ── Historial de facturación (Fase 5.d, no crítico — nunca rompe el webhook) ──
    // Comprobante informativo. Idempotente por ref_payco (unique). Si la tabla no
    // existe aún (migración sin aplicar), el error se ignora.
    try {
      const { data: prof } = await supabase
        .from('profiles').select('organization_id').eq('id', userId).maybeSingle();
      await supabase.from('billing_history').insert({
        organization_id: prof?.organization_id || null,
        user_id:         userId,
        ref_payco:       refPayco || null,
        plan_key:        planKey,
        billing:         billing || 'monthly',
        amount:          params.x_amount ? Number(params.x_amount) : null,
        currency:        params.x_currency_code || 'COP',
        status:          'pagada',
      }).then(() => {}, () => {}); // ignora unique/tabla-inexistente en silencio
    } catch (billErr) {
      console.error('[epayco] billing_history falló (no crítico):', billErr.message);
    }

    console.log(`[epayco] ✓ Suscripción activada vía webhook: user=${userId} plan=${planKey} billing=${billing}`);
    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('ePayco webhook error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
