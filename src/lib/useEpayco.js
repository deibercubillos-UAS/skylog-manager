// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID || "1577037";

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true // Mantenlo en true para pruebas
    });

    // --- REVISIÓN DE IDS TÉCNICOS (Columna ID/Token en ePayco) ---
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual", 
      escuadrilla_anual:   "plan_escuadrilla_mensual", 
      flota_mensual:       "plan_escuadrilla_mensual", 
      flota_anual:         "plan_escuadrilla_mensual" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // --- CÁLCULO DE MONTOS REALES (Ajustados a tus planes) ---
    let finalAmount = 0;
    if (planName.toLowerCase().includes('escuadrilla')) {
      // $49 USD mensuales -> ~$199.000 COP
      finalAmount = isAnnual ? 1910000 : 199000;
    } else {
      // $129 USD mensuales -> ~$525.000 COP
      finalAmount = isAnnual ? 5040000 : 525000;
    }

    const data = {
      // ATRIBUTOS DE SUSCRIPCIÓN (OBLIGATORIOS)
      id_plan: selectedPlanId,
      subscription: "true",      // Fuerza la creación de la suscripción
      type_checkout: "subscription",
      
      // Datos de la transacción
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      amount: finalAmount.toString(),
      
      // Configuración Técnica
      country: "co",
      lang: "es",
      external: "true", 
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      // Metadatos para el Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🎯 Disparando Suscripción Real:", { plan: selectedPlanId, monto: finalAmount });
    handler.open(data);
  } else {
    alert("Iniciando pasarela de pagos... Reintenta en un momento.");
  }
};