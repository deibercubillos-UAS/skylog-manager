    
// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    
    // CONFIGURACIÓN USANDO P_KEY (Necesaria para Checkout Pro)
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_P_KEY, // <-- CAMBIO A P_KEY
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
      description: `Suscripción ${isAnnual ? 'Anual' : 'Mensual'} BitaFly`,
      currency: "cop",
      country: "co",
      lang: "es",
      external: "false",

      // Identificación obligatoria
      p_cust_id_cliente: process.env.NEXT_PUBLIC_EPAYCO_CUST_ID,
      p_key: process.env.NEXT_PUBLIC_EPAYCO_P_KEY,
      
      // Metadatos para el Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    handler.open(data);
  }
};