
    // src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const EPAYCO_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_KEY,
      test: true 
    });

    // --- REVISA ESTOS IDS EN TU PANEL DE EPAYCO (Suscripciones -> Planes) ---
    // Deben ser los códigos que aparecen en la columna "ID / TOKEN"
        // 1. MAPEADO DE IDS (Asegúrate que coincidan con tu panel de ePayco)
       const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual",
      escuadrilla_anual:   "plan_escuadrilla_mensual",
      flota_mensual:       "plan_escuadrilla_mensual",
      flota_anual:         "plan_escuadrilla_mensual"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // Cálculo del monto inicial (ePayco lo exige para la primera cuota)
    const TRM = 4000;
    let amountUSD = planName.toLowerCase().includes('escuadrilla') ? 49 : 129;
    let finalAmountCOP = isAnnual ? (amountUSD * 12 * 0.8) * TRM : amountUSD * TRM;

    const data = {
      // --- ESTO ACTIVA LA SUSCRIPCIÓN REAL ---
      id_plan: selectedPlanId,
      subscribe: "true", // Fuerza el modo suscripción en algunas versiones
      
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      amount: finalAmountCOP.toString(),
      
      // Configuración
      country: "co",
      lang: "es",
      external: "true", 
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_KEY,
      
      // Metadatos para que tu Webhook sepa quién pagó
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🎯 Intentando crear Suscripción para el Plan ID:", selectedPlanId);
    handler.open(data);
  }
};