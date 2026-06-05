/**
 * GET /api/ops/diag-subs?token=XXX&cancel=ID
 * ENDPOINT TEMPORAL — eliminar después de usar
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SECRET = 'bitafly-cancel-tmp-2026';
const BASE = 'https://api.secure.payco.co';
const PUB_KEY = () => process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
const PRV_KEY = () => process.env.EPAYCO_PRIVATE_KEY;

async function getToken() {
  const res = await fetch(`${BASE}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: PUB_KEY(), private_key: PRV_KEY() }),
    cache: 'no-store',
  });
  const json = await res.json();
  const token = json.bearer_token || json.token;
  if (!token) throw new Error(`auth failed: ${JSON.stringify(json)}`);
  return token;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cancelId = searchParams.get('cancel');

  try {
    const token = await getToken();
    const hdrs = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      type: 'sdk-jwt',
      lang: 'NODE',
      Authorization: `Bearer ${token}`,
    };

    // Cancelar por ID si se pasó el parámetro cancel
    if (cancelId) {
      const res = await fetch(`${BASE}/recurring/v1/subscription/cancel`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({ id: cancelId, public_key: PUB_KEY() }),
      });
      const json = await res.json();
      return NextResponse.json({ cancelled: cancelId, response: json });
    }

    // Listar todas
    const res = await fetch(`${BASE}/recurring/v1/subscriptions/${PUB_KEY()}`, {
      headers: hdrs,
      cache: 'no-store',
    });
    const raw = await res.json();
    const arr = Array.isArray(raw) ? raw : (raw.data ?? raw.subscriptions ?? raw);
    const summary = Array.isArray(arr)
      ? arr.map(s => ({
          id:    s._id || s.id || s.uid,
          email: s.email || s.customer_data?.email || s.cliente?.email,
          status: s.status || s.state,
          plan:  s.idPlan || s.plan?.idClient,
          idCustomer: s.idCustomer,
        }))
      : arr;
    return NextResponse.json({ count: Array.isArray(arr) ? arr.length : '?', summary });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
