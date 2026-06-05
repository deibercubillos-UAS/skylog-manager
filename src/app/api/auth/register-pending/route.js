/**
 * POST /api/auth/register-pending
 *
 * Guarda los datos del formulario de registro en pending_registrations
 * y devuelve la URL de pago de ePayco para abrirla en nueva pestaña.
 *
 * El usuario NO se crea aquí. Se crea en el webhook cuando el pago sea confirmado.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EPAYCO_PLANS } from '@/lib/planLimits';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    // Rate limiting: 5 intentos por IP por hora
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`reg-pending:${ip}`, { limit: 5, windowMs: 3_600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
    }

    const body = await request.json();
    const { email, firstName, lastName, phone, city, type, role, companyName, nit, orgCode, selectedPlan, billing = 'monthly' } = body;

    // Validaciones básicas
    if (!email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }
    if (!['escuadrilla', 'flota', 'enterprise'].includes(selectedPlan)) {
      return NextResponse.json({ error: 'Plan no válido para pago.' }, { status: 400 });
    }

    const cfg = EPAYCO_PLANS[selectedPlan]?.[billing];
    if (!cfg) {
      return NextResponse.json({ error: 'Configuración de plan no encontrada.' }, { status: 400 });
    }

    const supabase = makeAdmin();

    // Verificar que el email no tenga ya una cuenta
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo electrónico.' }, { status: 409 });
    }

    // Verificar que no haya ya un pending activo para ese email
    const { data: existingPending } = await supabase
      .from('pending_registrations')
      .select('id, expires_at, completed_at')
      .ilike('email', email.trim())
      .is('completed_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingPending) {
      // Reutilizar el pending existente (el usuario volvió sin completar el pago)
      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('reference, plan_key, billing')
        .eq('id', existingPending.id)
        .single();

      const epaycoUrl = `https://subscription-landing.epayco.co/plan/${EPAYCO_PLANS[pending.plan_key]?.[pending.billing]?.planUid || cfg.planUid}`;
      return NextResponse.json({ reference: pending.reference, epaycoUrl });
    }

    // Referencia única
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    const reference = `bitafly_reg_${selectedPlan}_${billing}_${token}_${Date.now()}`;

    // Guardar datos de registro (incluye password — corta duración, service_role only, expira 3h)
    const { error: insertErr } = await supabase
      .from('pending_registrations')
      .insert({
        email:      email.trim().toLowerCase(),
        reference,
        plan_key:   selectedPlan,
        billing,
        reg_data: {
          email,
          password:    body.password,   // se usará solo para crear auth user cuando pago confirme
          firstName,
          lastName,
          phone:       phone || null,
          city:        city  || null,
          type:        type  || 'solo',
          role:        role  || 'admin',
          companyName: companyName || null,
          nit:         nit   || null,
          orgCode:     orgCode || null,
        },
      });

    if (insertErr) throw insertErr;

    const epaycoUrl = `https://subscription-landing.epayco.co/plan/${cfg.planUid}`;
    return NextResponse.json({ reference, epaycoUrl });

  } catch (err) {
    console.error('[register-pending]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
