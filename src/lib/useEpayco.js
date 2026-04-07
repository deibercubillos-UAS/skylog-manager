// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  // 1. Cargamos la llave que definiste
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID || "1577037";

  if (typeof window !== 'undefined' && window.ePayco) {
    
    // Inicialización del objeto ePayco
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    // 2. Definición de IDs de Planes (Tu ejemplo: plan_escuadrilla_mensual)
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual", 
      escuadrilla_anual:   "plan_escuadrilla_anual",
      flota_mensual:       "plan_flota_mensual",
      flota_anual:         "plan_flota_anual"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // 3. ASIGNACIÓN DE MONTO (Evita el error 'undefined')
    // Los montos deben ser coherentes con lo que configuraste en ePayco
    let amountValue = "0";
    if (planName.toLowerCase().includes('escuadrilla')) {
        amountValue = isAnnual ? "1910000" : "199000";
    } else {
        amountValue = isAnnual ? "5040000" : "525000";
    }

    const data = {
      // --- DATOS DE LA SUSCRIPCIÓN ---
      id_plan: selectedPlanId,
      amount: amountValue, // <--- Aquí garantizamos que NO sea undefined
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente BitaFly UAS`,
      currency: "cop",
      type_checkout: "subscription",
      
      // --- CONFIGURACIÓN DE SEGURIDAD ---
      country: "co",
      lang: "es",
      external: "true", 
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      // Metadatos para el Webhook (Sincronización Supabase)
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Abriendo pasarela para:", selectedPlanId, "Monto:", amountValue);
    handler.open(data);
  } else {
    alert("Cargando motor de pagos BitaFly... Reintenta en 1 segundo.");
  }
};