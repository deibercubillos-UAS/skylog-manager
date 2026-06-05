/**
 * GET /api/ops/diag-subs?token=XXX
 * ENDPOINT TEMPORAL — eliminar después de usar
 * Muestra las suscripciones raw de ePayco para diagnóstico
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

  try {
    const token = await getToken();
    const res = await fetch(`${BASE}/recurring/v1/subscriptions/${PUB_KEY()}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        type: 'sdk-jwt',
        lang: 'NODE',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    const raw = await res.json();
    // Extraer el array donde sea que esté
    const arr = Array.isArray(raw) ? raw : (raw.data ?? raw.subscriptions ?? raw);
    // Resumir: mostrar campos de email + status + id de cada suscripción
    const summary = Array.isArray(arr)
      ? arr.map(s => ({
          id:    s.id || s.uid || s._id || s.subscription_id,
          email: s.email || s.customer_data?.email || s.cliente?.email || s.subscriber?.email || s.payer?.email,
          status: s.status || s.state,
          plan:  s.plan || s.id_plan || s.plan_id,
          _keys: Object.keys(s),
        }))
      : arr;
    return NextResponse.json({ count: Array.isArray(arr) ? arr.length : '?', summary, raw });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
