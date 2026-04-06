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

    const data = {
      id_plan: selectedPlanId,
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente BitaFly UAS`,
      currency: "cop",
      type_checkout: "subscription",
      external: "true", 
      
      // Muy importante para el Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      email_billing: userEmail,
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    handler.open(data);
  }
};