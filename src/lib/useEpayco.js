// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    // --- REVISIÓN DE IDS TÉCNICOS ---
    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", 
      escuadrilla_anual:   "9be0e74f1778c85f40392bd", 
      flota_mensual:       "9be0e7df6630f6a394f7096", 
      flota_anual:         "9be0e81b6727c738608e137" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // Monto exacto (ePayco lo requiere para el primer cobro de la suscripción)
    let amountValue = 0;
    if (planName.toLowerCase().includes('escuadrilla')) {
      amountValue = isAnnual ? 1910000 : 199000;
    } else {
      amountValue = isAnnual ? 5040000 : 525000;
    }

    const data = {
      // --- CAMPOS PARA FORZAR SUSCRIPCIÓN ---
      id_plan: selectedPlanId,
      amount: amountValue.toString(),
      currency: "cop",
      type_checkout: "subscription", // <--- NUEVO: Indica que es suscripción
      
      // Bloqueamos PSE y Efectivo porque NO permiten cobro recurrente
      methodsDisable: ["pse", "cash", "efecty"], 

      name: `Suscripción BitaFly ${planName}`,
      description: `Plan ${isAnnual ? 'Anual' : 'Mensual'} - Cobro Recurrente Automático`,
      
      // Configuración de red
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

    console.log("🎯 Disparando Suscripción Real para:", selectedPlanId);
    handler.open(data);
  } else {
    alert("Iniciando pasarela de pagos... Reintenta en un momento.");
  }
};