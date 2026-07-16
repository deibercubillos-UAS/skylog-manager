// GET /api/dashboard/grant-expiry — estado del acceso gratuito del usuario
// (solo lectura). Alimenta el banner "vence en N días" — distinto del
// modal de bienvenida (welcome-invite): este se consulta en cada visita al
// dashboard mientras el acceso siga activo, no una sola vez.

import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user) return NextResponse.json({ hasGrant: false });

    const email = (ctx.user.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ hasGrant: false });

    const admin = createAdminClient();
    const { data: grant } = await admin
      .from('free_grants')
      .select('expires_at')
      .ilike('email', email)
      .eq('status', 'activado')
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!grant) return NextResponse.json({ hasGrant: false });

    const daysLeft = Math.ceil((new Date(grant.expires_at) - new Date()) / 86400000);
    return NextResponse.json({ hasGrant: true, expiresAt: grant.expires_at, daysLeft });
  } catch (err) {
    console.error('[dashboard/grant-expiry]', err.message);
    return NextResponse.json({ hasGrant: false });
  }
}
