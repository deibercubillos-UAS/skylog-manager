// FILE: src/app/api/subscription/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { PLAN_CONFIG } from '@/lib/planLimits';

export async function GET(request) {
  try {
    const supabase = await createClient();
    
    // Verificación de sesión mediante SSR (Cookies seguras)
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;

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
    console.error("API Subscription Error:", err.message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}