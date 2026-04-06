// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  // 1. Validar Llaves
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID || "1577037";

  if (!P_KEY) {
    alert("Error crítico: Llave de ePayco no configurada en el servidor.");
    return;
  }

  if (typeof window !== 'undefined' && window.ePayco) {
    
    // Configuración del handler
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    // 2. Mapeo de IDs de Planes (Asegúrate que coincidan con tu panel)
    const PLAN_IDS = {
      escuadrilla_mensual: "9be072c0f069fb47008f626", 
      escuadrilla_anual:   "9be0e74f1778c85f40392bd", 
      flota_mensual:       "9be0e7df6630f6a394f7096", 
      flota_anual:         "9be0e81b6727c738608e137" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // 3. CÁLCULO DE MONTO FORZADO (Evita el error 'undefined')
    // TRM estimada 4000 COP
    let amountValue = 0;
    if (planName.toLowerCase().includes('escuadrilla')) {
      amountValue = isAnnual ? 1910000 : 199000;
    } else {
      amountValue = isAnnual ? 5040000 : 525000;
    }

    const data = {
      // Atributos de Suscripción
      id_plan: selectedPlanId || "",
      amount: amountValue.toString(), // <--- ESTO YA NO SERÁ UNDEFINED
      
      // Info visual
      name: `BitaFly - Plan ${planName}`,
      description: `Suscripción ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      
      // Configuración de red
      country: "co",
      lang: "es",
      external: "true", 
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

    console.log("🚀 Enviando a ePayco:", data);
    handler.open(data);
  } else {
    alert("La pasarela de pagos se está cargando. Intenta de nuevo en 2 segundos.");
  }
};