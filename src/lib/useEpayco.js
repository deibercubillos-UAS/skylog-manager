// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true // Cambiar a false en producción
    });

    // IDS DE LOS PLANES QUE CREASTE EN EL DASHBOARD DE EPAYCO (Paso Crítico)
    const PLAN_IDS = {
      escuadrilla_mensual: "2e2aa67391a6c81cbefbaeab54c4dc22",
      escuadrilla_anual:   "ID_PLAN_ESCUADRILLA_ANUAL",
      flota_mensual:       "ID_PLAN_FLOTA_MENSUAL",
      flota_anual:         "ID_PLAN_FLOTA_ANUAL"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    const data = {
      // --- LÓGICA DE TOKENIZACIÓN Y SUSCRIPCIÓN ---
      id_plan: selectedPlanId, 
      name: `Suscripción BitaFly - ${planName}`,
      description: `Plan Recurrente ${planName} (${isAnnual ? 'Anual' : 'Mensual'})`,
      currency: "cop",
      country: "co",
      lang: "es",
      external: "false",
      
      // Datos para vincular al usuario en el Webhook
      extra1: planName.toLowerCase(), // Plan slug
      extra2: userId,                 // ID Supabase
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      
      // URLs de comunicación
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,
    };

    // Abre el modal que tokeniza la tarjeta y crea la suscripción en ePayco
    handler.open(data);
  }
};