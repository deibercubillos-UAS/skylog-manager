
export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  // Forzamos la lectura directa
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID || "1577037";

  // LOG DE SEGURIDAD (Muestra los primeros 5 caracteres para confirmar que llegó)
  console.log("🔍 Verificando Llave en Navegador:", P_KEY ? `Detectada (${P_KEY.substring(0,5)}...)` : "❌ NO DETECTADA");

  if (!P_KEY || P_KEY === "undefined") {
    alert("Error Crítico: La llave pública de ePayco no está configurada en Vercel. Realiza un Redeploy.");
    return;
  }
  if (typeof window !== 'undefined' && window.ePayco) {
    
    // CONFIGURACIÓN INICIAL DEL HANDLER
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    // IDS TÉCNICOS (Deben coincidir con tu panel de ePayco -> Suscripciones -> Planes)
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual", 
      escuadrilla_anual:   "plan_escuadrilla_mensual", 
      flota_mensual:       "plan_escuadrilla_mensual", 
      flota_anual:         "plan_escuadrilla_mensual" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // Cálculo de monto inicial en COP (Simbólico para validación)
    const amount = isAnnual ? "20000" : "10000";

    const data = {
      id_plan: selectedPlanId,
      name: `BitaFly - Plan ${planName}`,
      description: `Suscripción BitaFly UAS - Cobro Recurrente`,
      currency: "cop",
      amount: amount,
      type_checkout: "subscription",
      external: "true", 
      
      // Identificación de BitaFly
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

    console.log("🚀 Abriendo Checkout Pro BitaFly...");
    handler.open(data);
  } else {
    alert("Iniciando pasarela de pagos... Reintenta en un momento.");
  }
};