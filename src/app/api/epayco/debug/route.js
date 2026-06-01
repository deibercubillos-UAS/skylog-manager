// GET /api/epayco/debug?uid=XXX&id_plan=XXX&amount=XXX
// Solo accesible para superadmin (usa la sesión activa, no ADMIN_SECRET)
import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';

const BASE = 'https://api.secure.payco.co';

async function getRawToken() {
  const res = await fetch(`${BASE}/v1/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      public_key:  process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      private_key: process.env.EPAYCO_PRIVATE_KEY,
    }),
    cache: 'no-store',
  });
  const json = await res.json();
  return { httpStatus: res.status, json, token: json.bearer_token || json.token };
}

export async function GET(request) {
  // Auth por sesión de superadmin
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Solo superadmin' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const uid    = searchParams.get('uid');
  const idPlan = searchParams.get('id_plan');
  const amount = searchParams.get('amount') || '20000';

  // 1. Auth ePayco
  const authResult = await getRawToken();
  if (!authResult.token) {
    return NextResponse.json({ step: 'auth_failed', authResult });
  }

  const hdrs = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
    'type':         'sdk-jwt',
    'lang':         'NODE',
    'Authorization': `Bearer ${authResult.token}`,
  };

  if (!uid) {
    return NextResponse.json({
      auth: 'OK',
      token_preview: authResult.token.slice(0, 30) + '...',
      next: 'Agrega ?uid=_id&id_plan=nombre&amount=precio a la URL',
    });
  }

  // 2. Prueba minimal (solo name + amount + trial_days)
  const bodyMin = { name: idPlan, amount: Number(amount), trial_days: 0 };
  const resMin  = await fetch(`${BASE}/recurring/v1/plan/edit/${uid}`, {
    method: 'POST', headers: hdrs, body: JSON.stringify(bodyMin),
  });
  const jsonMin = await resMin.json();

  // 3. Prueba con public_key
  const bodyPK = { public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY, name: idPlan, amount: Number(amount), trial_days: 0 };
  const resPK  = await fetch(`${BASE}/recurring/v1/plan/edit/${uid}`, {
    method: 'POST', headers: hdrs, body: JSON.stringify(bodyPK),
  });
  const jsonPK = await resPK.json();

  // 4. Prueba completa
  const bodyFull = {
    public_key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
    id_plan:    idPlan,
    name:       idPlan,
    description: 'Test update',
    amount:     Number(amount),
    currency:   'COP',
    interval:   'month',
    interval_count: 1,
    trial_days: 0,
  };
  const resFull = await fetch(`${BASE}/recurring/v1/plan/edit/${uid}`, {
    method: 'POST', headers: hdrs, body: JSON.stringify(bodyFull),
  });
  const jsonFull = await resFull.json();

  return NextResponse.json({
    uid, id_plan: idPlan, amount,
    minimal:       { status: resMin.status,  body: bodyMin,  response: jsonMin  },
    with_pub_key:  { status: resPK.status,   body: bodyPK,   response: jsonPK   },
    full:          { status: resFull.status, body: bodyFull, response: jsonFull },
  });
}
