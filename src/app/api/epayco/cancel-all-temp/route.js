// ENDPOINT TEMPORAL — se borra después de usarse una vez
// GET /api/admin/cancel-all-epayco?token=OPS_TOKEN_2026_CANCELALL
import { NextResponse } from 'next/server';
import { listSubscriptions, cancelSubscription } from '@/lib/epayco';

const ONE_TIME_TOKEN = 'OPS_TOKEN_2026_CANCELALL_b9f3e1';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('token') !== ONE_TIME_TOKEN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const subs = await listSubscriptions();
    console.log(`cancel-all: ${subs.length} suscripciones encontradas en ePayco`);
    console.log('Detalle:', JSON.stringify(subs.map(s => ({
      id: s.id || s.uid || s._id,
      email: s.customer_data?.email || s.email || '?',
      status: s.status,
      plan: s.id_plan || s.plan || '?',
    }))));

    const results = [];
    for (const s of subs) {
      const uid = s.id || s.uid || s._id || s.subscription_id;
      const email = s.customer_data?.email || s.email || '?';
      const status = String(s.status || '').toLowerCase();
      const isActive = ['active', '1', 'activa', 'activo', 'true'].includes(status) || !s.status;

      if (!uid) { results.push({ email, status: 'sin_uid', raw: s }); continue; }
      if (!isActive) { results.push({ uid, email, status: 'ya_inactiva' }); continue; }

      try {
        await cancelSubscription(uid);
        results.push({ uid, email, status: 'cancelada' });
        console.log(`✓ Cancelada: ${uid} ${email}`);
      } catch (err) {
        results.push({ uid, email, status: 'error', error: err.message });
        console.error(`✗ Error cancelando ${uid}:`, err.message);
      }
    }

    return NextResponse.json({ total: subs.length, results });
  } catch (err) {
    console.error('cancel-all error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
