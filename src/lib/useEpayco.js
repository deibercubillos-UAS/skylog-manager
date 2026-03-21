// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, price, userEmail = "", userId = "", isAnnual = false) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true // Cambiar a false para producción
    });

    // --- CONFIGURACIÓN DE PRECIOS (VALORES EN COP) ---
    // Mensuales: Escuadrilla ($199k), Flota ($525k)
    // Anuales (con 20% ahorro): Escuadrilla ($1.91M), Flota ($5.04M)
    
    let finalAmount = 0;
    const planSlug = planName.toLowerCase();

    if (planSlug.includes('escuadrilla')) {
      finalAmount = isAnnual ? 1428000 : 119000;
    } else if (planSlug.includes('flota')) {
      finalAmount = isAnnual ? 5040000 : 525000;
    }

   const epaycoPlanIds = {
      'escuadrilla_mensual': 'https://subscription-landing.epayco.co/plan/9be09237237867acf0c4d53',
      'escuadrilla_anual':   'https://subscription-landing.epayco.co/plan/9be09237237867acf0c4d53',
      'flota_mensual':       'ID_QUE_TE_DIO_EPAYCO_3',
      'flota_anual':         'ID_QUE_TE_DIO_EPAYCO_4'
    };

    const planKey = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = epaycoPlanIds[planKey];

    const data = {
      // Configuración básica
      name: `BitaFly Manager`,
      description: description,
      currency: "cop",
      amount: finalAmount.toString(),
      tax_base: "0",
      tax: "0",
      country: "co",
      lang: "es",
      external: "false",
      id_plan: selectedPlanId,

      // --- ATRIBUTOS PARA EL BACKEND (Webhook) ---
      extra1: planName.toLowerCase(),            // Nombre del plan (escuadrilla/flota)
      extra2: userId,              // ID del usuario de Supabase
      extra3: isAnnual ? 'anual' : 'mensual', // Ciclo de cobro
      
      // Datos del cliente
      email_billing: userEmail,
      
      // URLs de retorno
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,

      
    };
    

    handler.open(data);
  } else {
    console.error("ePayco SDK no cargado. Verifica src/app/layout.js");
    alert("Cargando pasarela de pagos... por favor intenta en 2 segundos.");
  }
};