/**
 * GET /api/ops/cancel-sub-tmp?token=XXX&email=XXX
 * ENDPOINT TEMPORAL — eliminar después de usar
 */
import { NextResponse } from 'next/server';
import { cancelSubscriptionsByEmail } from '@/lib/epayco';

export const dynamic = 'force-dynamic';

const SECRET = 'bitafly-cancel-tmp-2026';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  if (token !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!email) return NextResponse.json({ error: 'email requerido' }, { status: 400 });
  try {
    const result = await cancelSubscriptionsByEmail(email);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
