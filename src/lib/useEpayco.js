// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const EPAYCO_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_KEY,
      test: true // Cambiar a false en producción
    });

    // 1. IDS DE PLANES (Deben coincidir con tu panel de ePayco)
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual", 
      escuadrilla_anual:   "plan_escuadrilla_mensual",
      flota_mensual:       "plan_escuadrilla_mensual",
      flota_anual:         "plan_escuadrilla_mensual"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // 2. CÁLCULO DE MONTO EN COP (Obligatorio para evitar el error de undefined)
    // Valores aproximados en COP para la validación inicial
    let amountCOP = 0;
    if (planName.toLowerCase().includes('escuadrilla')) {
        amountCOP = isAnnual ? 1910000 : 199000;
    } else if (planName.toLowerCase().includes('flota')) {
        amountCOP = isAnnual ? 5040000 : 525000;
    }

    const data = {
      // Atributos de la suscripción
      id_plan: selectedPlanId,
      amount: amountCOP.toString(), // <--- SOLUCIÓN AL ERROR UNDEFINED
      name: `BitaFly - ${planName}`,
      description: `Suscripción ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      
      // Configuración técnica
      country: "co",
      lang: "es",
      external: "true", 
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_KEY,
      
      // Metadatos para el Webhook de BitaFly
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Iniciando Checkout BitaFly:", { plan: selectedPlanId, monto: amountCOP });
    handler.open(data);
  } else {
    alert("Sincronizando con ePayco... Reintenta en un momento.");
  }
};