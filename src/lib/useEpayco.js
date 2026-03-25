       // src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const EPAYCO_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_KEY,
      test: true 
    });

     // 1. DICCIONARIO DE IDS (REEMPLAZA CON LOS DE TU PANEL DE EPAYCO)
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual",
      escuadrilla_anual:   "plan_escuadrilla_mensual",
      flota_mensual:       "plan_escuadrilla_mensual",
      flota_anual:         "plan_escuadrilla_mensual"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;

    const data = {
      id_plan: PLAN_IDS[key] || "",
      name: `BitaFly - ${planName}`,
      description: `Suscripción ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      country: "co",
      lang: "es",
      
      // --- CAMBIO CLAVE: REDIRECCIÓN EXTERNA ---
      external: "true", 
      
      // Identificación de comercio
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_KEY,
      
      // Metadatos para el Webhook de BitaFly
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      email_billing: userEmail,
      
      // URLs oficiales (Asegúrate de que no tengan espacios)
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Redirigiendo a Pasarela Segura ePayco...");
    handler.open(data);
  } else {
    alert("Iniciando conexión con ePayco... Reintenta en un segundo.");
  }
};

export const BITAFLY_PLANS = {
  escuadrilla_mensual: "plan_escuadrilla_mensual",
  escuadrilla_anual:   "plan_escuadrilla_anual",
  flota_mensual:       "plan_flota_mensual",
  flota_anual:         "plan_flota_anual"
};