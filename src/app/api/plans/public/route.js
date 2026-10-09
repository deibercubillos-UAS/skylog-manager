// GET /api/plans/public — precios de los planes para las páginas públicas (sin sesión).
// V2: la fuente es `lib/v2/planLimits.js#PLAN_PRICING` (la misma que usa el cobro con Wompi), así la página de precios
// y el checkout no pueden diverger. Forma: { piloto: { monthly: { amount, trialDays }, annual: {...} }, ... }
import { NextResponse } from 'next/server';
import { PLAN_PRICING } from '@/lib/v2/planLimits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = {};
  for (const [plan, billings] of Object.entries(PLAN_PRICING)) {
    result[plan] = {};
    for (const [billing, cfg] of Object.entries(billings)) {
      result[plan][billing] = { amount: cfg.amount, trialDays: cfg.trialDays ?? null };
    }
  }
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
