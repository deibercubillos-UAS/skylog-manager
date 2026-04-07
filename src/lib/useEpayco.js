// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", 
      escuadrilla_anual:   "9be0e74f1778c85f40392bd", 
      flota_mensual:       "9be0e7df6630f6a394f7096", 
      flota_anual:         "9be0e81b6727c738608e137" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // Monto simbólico obligatorio para validar el Checkout
    let amountValue = isAnnual ? "20000" : "10000";

    const data = {
      // --- IDENTIFICACIÓN DEL COMERCIO (SOLUCIÓN AL ERROR TDC) ---
      p_cust_id_cliente: "1577037", 
      p_key: P_KEY,

      // --- CONFIGURACIÓN DE SUSCRIPCIÓN ---
      id_plan: selectedPlanId,
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente BitaFly UAS`,
      currency: "cop",
      amount: amountValue,
      
      // --- INTERFAZ ---
      country: "co",
      lang: "es",
      external: "true", 
      
      // --- METADATOS ---
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      email_billing: userEmail,
      
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Enviando parámetros a ePayco:", { plan: selectedPlanId, cust: CUST_ID });
    handler.open(data);
  }
};