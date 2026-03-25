// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    
    // Configuración inicial del comercio
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true // Cambiar a false para producción
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
      // Atributos de la suscripción
      id_plan: PLAN_IDS[key] || "",
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente ${planName} (${isAnnual ? 'Anual' : 'Mensual'})`,
      currency: "cop",
      country: "co",
      lang: "es",
      external: "false",

      // Identificación del comercio (Agregamos el ID de cliente para evitar el ERR_CONNECTION_RESET)
      p_cust_id_cliente: process.env.NEXT_PUBLIC_EPAYCO_CUST_ID,
      
      // Metadatos para tu Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      // Datos del pagador
      email_billing: userEmail,
      
      // URLs oficiales de BitaFly
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Abriendo pasarela BitaFly para el plan:", key);
    handler.open(data);
  } else {
    alert("Sincronizando con ePayco... Pulsa de nuevo en un segundo.");
  }
};