import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { WOMPI_PRICES } from '@/lib/planLimits';
import crypto from 'crypto';

// Genera referencia única y hash de integridad para el widget Wompi
export async function POST(request) {
  try {
    const { planKey, billing } = await request.json(); // billing: 'monthly' | 'annual'

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const prices = WOMPI_PRICES[planKey];
    if (!prices) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });

    const amountCents = billing === 'annual' ? prices.annual : prices.monthly;
    if (!amountCents) return NextResponse.json({ error: 'Plan sin costo' }, { status: 400 });

    // Referencia única: bitafly_{plan}_{billing}_{userId}_{timestamp}
    const reference = `bitafly_${planKey}_${billing}_${user.id}_${Date.now()}`;
    const currency = 'USD';

    // Hash de integridad: SHA256(reference + amountCents + currency + integritySecret)
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
    const raw = `${reference}${amountCents}${currency}${integritySecret}`;
    const integrity = crypto.createHash('sha256').update(raw).digest('hex');

    return NextResponse.json({
      reference,
      amountCents,
      currency,
      integrity,
      publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
      redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/subscription?payment=result`,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
