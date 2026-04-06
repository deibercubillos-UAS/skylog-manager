// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const EPAYCO_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_KEY,
      test: true // Mantenlo en TRUE para pruebas
    });

    // --- REVISIÓN DE IDS (Basado en tu link anterior) ---
    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", 
      escuadrilla_anual:   "TU_ID_ANUAL_AQUI", // Búscalo en tu panel
      flota_mensual:       "TU_ID_FLOTA_MENS_AQUI",
      flota_anual:         "TU_ID_FLOTA_ANUAL_AQUI"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    const data = {
      // --- CLAVE PARA SUSCRIPCIÓN REAL ---
      // Al NO enviar "amount", ePayco entiende que debe usar los valores del Plan
      id_plan: selectedPlanId,
      
      name: `BitaFly - ${planName}`,
      description: `Activación de Suscripción Recurrente BitaFly`,
      currency: "cop",
      
      // Configuración de interfaz
      country: "co",
      lang: "es",
      external: "true", // Redirección para evitar bloqueos de token
      
      // Identificación de tu comercio
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_KEY,
      
      // Metadatos para que tu Webhook sepa a quién activar
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      // Datos obligatorios del pagador
      email_billing: userEmail,
      
      // URLs de BitaFly
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🎯 Disparando Suscripción para ID Plan:", selectedPlanId);
    handler.open(data);
  }
};