// GET /api/epayco/debug?uid=XXX&admin=SECRET
// Prueba el endpoint de actualización con respuesta RAW completa de ePayco
import { NextResponse } from 'next/server';

const BASE = 'https://api.secure.payco.co';

async function getToken() {
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
  return { httpStatus: res.status, json };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('admin') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const uid      = searchParams.get('uid');      // _id del plan en ePayco
  const idPlan   = searchParams.get('id_plan');  // ej: piloto_anual
  const amount   = searchParams.get('amount');   // ej: 20000

  // 1. Auth
  const authResult = await getToken();
  const token = authResult.json.bearer_token || authResult.json.token;

  if (!token) {
    return NextResponse.json({ step: 'auth', authResult });
  }

  if (!uid) {
    return NextResponse.json({ step: 'auth_ok', token: token.slice(0, 20) + '...', authResult: authResult.json });
  }

  // 2. Prueba de update con body mínimo
  const bodyMinimal = {
    name:        idPlan || 'Test Plan',
    amount:      Number(amount || 20000),
    trial_days:  0,
  };

  const resMinimal = await fetch(`${BASE}/recurring/v1/plan/edit/${uid}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'type':         'sdk-jwt',
      'lang':         'NODE',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(bodyMinimal),
  });
  const jsonMinimal = await resMinimal.json();

  // 3. Prueba con body completo
  const bodyFull = {
    id_plan:        idPlan,
    name:           idPlan || 'Test Plan',
    description:    'Test update',
    amount:         Number(amount || 20000),
    currency:       'COP',
    interval:       'month',
    interval_count: 1,
    trial_days:     0,
  };

  const resFull = await fetch(`${BASE}/recurring/v1/plan/edit/${uid}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'type':         'sdk-jwt',
      'lang':         'NODE',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(bodyFull),
  });
  const jsonFull = await resFull.json();

  return NextResponse.json({
    uid,
    minimal: { httpStatus: resMinimal.status, body: bodyMinimal, response: jsonMinimal },
    full:    { httpStatus: resFull.status,    body: bodyFull,    response: jsonFull    },
  });
}
