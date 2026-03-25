import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { PLAN_CONFIG } from '@/lib/planLimits';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    // Validación de seguridad básica
    if (!userId || userId === 'undefined') {
      return NextResponse.json({ error: "ID de usuario no proporcionado" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    // 1. Consultar el plan y los conteos actuales en paralelo para velocidad
    const [profileRes, dronesRes, pilotsRes] = await Promise.all([
      supabase.from('profiles').select('subscription_plan').eq('id', userId).single(),
      supabase.from('aircraft').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('pilots').select('id', { count: 'exact', head: true }).eq('owner_id', userId).eq('is_active', true)
    ]);

    const planKey = profileRes.data?.subscription_plan || 'piloto';
    const currentPlan = PLAN_CONFIG[planKey];

    // 2. Responder con la data estructurada
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
    console.error("Error en API Subscription:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  
    const handleCancel = async () => {
    if (!confirm("¿Seguro que deseas cancelar? Volverás al Plan Piloto.")) return;
    
    setActionLoading('cancel');
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id })
      });

      if (response.ok) {
        alert("✅ Suscripción cancelada. Tu cuenta ha sido degradada al Plan Piloto.");
        window.location.reload(); // Recargamos para ver los cambios
      } else {
        throw new Error("Falla en servidor");
      }
    } catch (e) {
      alert("Error al cancelar la suscripción.");
    } finally {
      setActionLoading(null);
    }
  };}
}