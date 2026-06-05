/**
 * POST /api/admin/cancel-epayco-email
 * ENDPOINT TEMPORAL — eliminar después de usar
 */
import { NextResponse } from 'next/server';
import { cancelSubscriptionsByEmail } from '@/lib/epayco';

export const dynamic = 'force-dynamic';

const SECRET = 'bitafly-cancel-tmp-2026';

export async function POST(request) {
  const { token, email } = await request.json();
  if (token !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await cancelSubscriptionsByEmail(email);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
