// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true // Mantenlo en true para pruebas
    });

    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", 
      escuadrilla_anual:   "9be0e74f1778c85f40392bd", 
      flota_mensual:       "9be0e7df6630f6a394f7096", 
      flota_anual:         "9be0e81b6727c738608e137" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // Cálculo de monto inicial en COP
    let amountValue = 0;
    if (planName.toLowerCase().includes('escuadrilla')) {
      amountValue = isAnnual ? 1910000 : 199000;
    } else {
      amountValue = isAnnual ? 5040000 : 525000;
    }

    const data = {
      // --- CAMPOS OBLIGATORIOS PARA SUSCRIPCIÓN REAL ---
      id_plan: selectedPlanId,
      subscription: "true",      // Fuerza el modo suscripción
      type_checkout: "subscription",
      
      amount: amountValue.toString(),
      currency: "cop",
      name: `Suscripción BitaFly ${planName}`,
      description: `Plan ${isAnnual ? 'Anual' : 'Mensual'} - Recurrencia Automática`,
      
      // Identificación de comercio (Duplicado aquí para asegurar el Client Token)
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      // Configuración técnica
      country: "co",
      lang: "es",
      external: "true", 
      
      // Metadatos para el Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      
      // URLs de BitaFly
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🎯 Disparando Suscripción Certificada BitaFly...");
    handler.open(data);
  } else {
    alert("Iniciando pasarela de pagos... Reintenta en un momento.");
  }
};