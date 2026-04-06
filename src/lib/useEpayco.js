// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const EPAYCO_P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_P_KEY,
      test: true 
    });

    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", 
      escuadrilla_anual:   "9be0e74f1778c85f40392bd", // Reemplazar con ID Real
      flota_mensual:       "9be0e7df6630f6a394f7096", // Reemplazar con ID Real
      flota_anual:         "9be0e81b6727c738608e137"  // Reemplazar con ID Real
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // CÁLCULO DE MONTO EN COP (Obligatorio para evitar error undefined)
    let amountCOP = 0;
    if (planName.toLowerCase().includes('escuadrilla')) {
        amountCOP = isAnnual ? 1910000 : 199000;
    } else if (planName.toLowerCase().includes('flota')) {
        amountCOP = isAnnual ? 5040000 : 525000;
    }

    const data = {
      // Atributos de Suscripción
      id_plan: selectedPlanId,
      amount: amountCOP.toString(),
      
      // Información Visual
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      
      // Configuración Técnica
      country: "co",
      lang: "es",
      external: "true", 
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_P_KEY,
      
      // Metadatos Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Iniciando Checkout Seguro para:", key);
    handler.open(data);
  } else {
    alert("Sincronizando con ePayco... Reintenta en 2 segundos.");
  }
};