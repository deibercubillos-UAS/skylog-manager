// GET   /api/epayco/config  → lista todos los planes configurables
// PATCH /api/epayco/config  → actualiza un plan en Supabase + ePayco
import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { updatePlan } from '@/lib/epayco';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Auth: solo superadmin (misma política que el PATCH de abajo).
  // Esta tabla la gestiona el admin client (bypassa RLS), así que el guard
  // de sesión es la única barrera — no dejarla abierta.
  const ssr = await createClientSSR();
  const ctx = await getOrgContext(ssr);
  if (!ctx.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (ctx.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('epayco_plan_config')
    .select('*')
    .order('plan_key')
    .order('billing');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request) {
  // Solo superadmin
  const supabase = await createClientSSR();
  const ctx = await getOrgContext(supabase);
  if (!ctx.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  if (ctx.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 });
  }

  const { id, name, description, amount, trial_days, replay_retention_days, replay_max_flights } = await request.json();
  if (!id || !name || !amount) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Leer registro actual para obtener epayco_uid y billing
  const { data: current, error: readErr } = await admin
    .from('epayco_plan_config').select('*').eq('id', id).single();
  if (readErr || !current) {
    return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });
  }

  // Actualizar en ePayco usando epayco_id (id_plan) como identificador en la URL
  let epaycoResult = null;
  let epaycoError = null;
  try {
    epaycoResult = await updatePlan(current.epayco_id, {
      name,
      description:  description || current.description,
      amount:       Number(amount),
      trialDays:    trial_days ?? current.trial_days,
      billingKey:   current.billing,
    });
  } catch (err) {
    epaycoError = err.message;
    console.error('ePayco updatePlan error:', err.message);
  }

  // Guardar en Supabase (aunque ePayco falle)
  const { error: updateErr } = await admin
    .from('epayco_plan_config')
    .update({
      name,
      description:           description || current.description,
      amount:                Number(amount),
      trial_days:            trial_days ?? current.trial_days,
      replay_retention_days: replay_retention_days != null ? Number(replay_retention_days) : current.replay_retention_days,
      replay_max_flights:    replay_max_flights    != null ? Number(replay_max_flights)    : current.replay_max_flights,
      updated_at:            new Date().toISOString(),
    })
    .eq('id', id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({
    success:       true,
    epayco:        epaycoResult,
    epayco_warning: epaycoError,
  });
}
