// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, userEmail, userId, isAnnual) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    
    // 1. CONFIGURACIÓN DEL COMERCIO
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY, // Usa tu Public Key larga
      test: true // Cambiar a false en producción
    });

    // 2. IDS DE TUS PLANES (Asegúrate que coincidan con tu panel ePayco)
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual", 
      escuadrilla_anual:   "plan_escuadrilla_mensual", 
      flota_mensual:       "plan_escuadrilla_mensual", 
      flota_anual:         "plan_escuadrilla_mensual" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // 3. DATOS DE LA SUSCRIPCIÓN
    const data = {
      id_plan: selectedPlanId,
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente BitaFly UAS`,
      currency: "cop",
      type_checkout: "subscription",
      external: "true", // Abre en ventana aparte para evitar errores de red
      
      // Metadatos para que el Webhook sepa quién paga
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      email_billing: userEmail,
      p_cust_id_cliente: "1577037", // Tu ID de Comercio
      
      // URLs de BitaFly
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Redirigiendo a pasarela ePayco para el plan:", selectedPlanId);
    handler.open(data);
  } else {
    alert("Iniciando conexión segura... Reintenta en 2 segundos.");
  }
};