// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const EPAYCO_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_KEY,
      test: true 
    });

    // --- REEMPLAZA ESTOS CON LOS IDS TÉCNICOS DE TU PANEL DE EPAYCO ---
    // (El que me pasaste termina en 008f626)
    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", // ID REAL que me enviaste
      escuadrilla_anual:   "ID_ANUAL_DE_TU_PANEL",   
      flota_mensual:       "ID_FLOTA_MENS_DE_TU_PANEL",
      flota_anual:         "ID_FLOTA_ANUAL_DE_TU_PANEL"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // Monto exacto que tiene el plan en ePayco (para que no de error de rango)
    const amount = planName.toLowerCase().includes('escuadrilla') ? '199000' : '525000';

    const data = {
      id_plan: selectedPlanId,
      name: `Plan ${planName} Mensual`, // Ajustado para coincidir con ePayco
      description: `Suscripción Mensual BitaFly UAS`,
      currency: "cop",
      amount: amount, 
      
      country: "co",
      lang: "es",
      external: "true", 
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_KEY,
      
      // Metadatos para tu Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Sincronizando con Plan ID:", selectedPlanId);
    handler.open(data);
  }
};