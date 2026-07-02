import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing-history
 *
 * Historial de pagos del usuario actual (Fase 5.d, comprobante informativo).
 * RLS ya restringe a user_id = auth.uid(); igual filtramos por user.id.
 * Si la tabla aún no existe (migración sin aplicar), degrada a vacío.
 */
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { user } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('billing_history')
      .select('id, ref_payco, plan_key, billing, amount, currency, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ entries: [], pending: true });
    return NextResponse.json({ entries: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
