import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PLAN_CONFIG } from '@/lib/planLimits';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    if (!userId || !authHeader) {
      return NextResponse.json({ error: "Sesión no válida" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Consultar Plan y Conteos
    const [profileRes, dronesRes, pilotsRes] = await Promise.all([
      supabase.from('profiles').select('subscription_plan').eq('id', userId).single(),
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('pilots').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('is_active', true)
    ]);

    const planKey = profileRes.data?.subscription_plan || 'piloto';
    const currentPlan = PLAN_CONFIG[planKey];

    return NextResponse.json({
      planName: currentPlan.name,
      planSlug: planKey,
      usage: {
        drones: { current: dronesRes.count || 0, limit: currentPlan.maxDrones },
        pilots: { current: pilotsRes.count || 0, limit: currentPlan.maxPilots }
      },
      features: currentPlan.features
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
