// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    // IDs Técnicos de tus planes en ePayco
    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", 
      escuadrilla_anual:   "9be0e74f1778c85f40392bd", 
      flota_mensual:       "9be0e7df6630f6a394f7096", 
      flota_anual:         "9be0e81b6727c738608e137" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // CÁLCULO DE MONTO FIJO (Para evitar el error de undefined)
    let amountCOP = 0;
    if (planName.toLowerCase().includes('escuadrilla')) {
      amountCOP = isAnnual ? 1910000 : 199000;
    } else {
      amountCOP = isAnnual ? 5040000 : 525000;
    }

    const data = {
      id_plan: selectedPlanId,
      amount: amountCOP.toString(), // <--- SOLUCIÓN AL ERROR UNDEFINED
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente BitaFly UAS`,
      currency: "cop",
      type_checkout: "subscription",
      external: "true", 
      
      // Identificación para el Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      // Datos del comercio (Soluciona el error de Client Token)
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      email_billing: userEmail,
      
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🎯 Disparando Suscripción:", selectedPlanId);
    handler.open(data);
  } else {
    alert("Cargando pasarela segura... Reintenta en un momento.");
  }
};