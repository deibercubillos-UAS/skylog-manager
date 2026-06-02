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

  const body = {
    public_key:  process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
    id_plan:     idPlan,
    name:        idPlan,
    description: 'Test update',
    amount:      Number(amount),
    currency:    'COP',
    interval:    'month',
    interval_count: 1,
    trial_days:  0,
  };

  // Prueba A: URL usa _id de MongoDB (lo que teníamos)
  const resA = await fetch(`${BASE}/recurring/v1/plan/edit/${uid}`, {
    method: 'POST', headers: hdrs, body: JSON.stringify(body),
  });
  const jsonA = await resA.json();

  // Prueba B: URL usa id_plan en lugar de _id
  const resB = await fetch(`${BASE}/recurring/v1/plan/edit/${idPlan}`, {
    method: 'POST', headers: hdrs, body: JSON.stringify(body),
  });
  const jsonB = await resB.json();

  // Prueba C: GET del plan por _id — verifica si el _id es correcto para GET
  const resGetById = await fetch(`${BASE}/recurring/v1/plan/${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}/${uid}`, {
    headers: hdrs, cache: 'no-store',
  });
  const jsonGetById = await resGetById.json();

  // Prueba D: GET del plan por id_plan
  const resGetByPlan = await fetch(`${BASE}/recurring/v1/plan/${process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY}/${idPlan}`, {
    headers: hdrs, cache: 'no-store',
  });
  const jsonGetByPlan = await resGetByPlan.json();

  return NextResponse.json({
    uid, id_plan: idPlan, amount,
    'A_edit_by_uid':    { status: resA.status,        response: jsonA        },
    'B_edit_by_id_plan':{ status: resB.status,        response: jsonB        },
    'C_get_by_uid':     { status: resGetById.status,  response: jsonGetById  },
    'D_get_by_id_plan': { status: resGetByPlan.status,response: jsonGetByPlan},
  });
}
