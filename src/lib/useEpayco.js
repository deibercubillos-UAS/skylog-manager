// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    // IDS TÉCNICOS (Deben ser EXACTAMENTE los de la columna ID/Token en ePayco)
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual", 
      escuadrilla_anual:   "plan_escuadrilla_mensual", 
      flota_mensual:       "plan_escuadrilla_mensual", 
      flota_anual:         "plan_escuadrilla_mensual" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    const data = {
      // --- LÓGICA DE SUSCRIPCIÓN PURA ---
      id_plan: selectedPlanId,
      name: `Suscripción BitaFly - ${planName}`,
      description: `Plan Recurrente BitaFly UAS`,
      currency: "cop",
      
      // Intentamos omitir 'amount' para que lo tome del plan de ePayco
      // Si el modal da error, pon el valor exacto que pusiste en ePayco aquí:
      // amount: isAnnual ? "1910000" : "199000",

      country: "co",
      lang: "es",
      external: "true", 
      
      // Identificación de tu comercio
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      // Metadatos CRÍTICOS para el Webhook (Sin estos no se actualiza el plan)
      extra1: planName.toLowerCase(), // El slug para Supabase
      extra2: userId,                 // Tu ID de Supabase
      
      email_billing: userEmail,
      
      // URLs de comunicación
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🎯 Disparando suscripción para el usuario:", userId);
    handler.open(data);
  }
};