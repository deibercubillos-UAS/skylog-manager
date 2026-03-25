   // src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  // 1. Obtener llaves (Priorizando variables de entorno)
  const EPAYCO_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID || "1577037";

  if (!EPAYCO_KEY) {
    console.error("❌ ERROR: NEXT_PUBLIC_EPAYCO_P_KEY no detectada.");
    alert("Error de configuración: La llave de pago no está cargada. Contacta a soporte.");
    return;
  }

  if (typeof window !== 'undefined' && window.ePayco) {
    
    // CONFIGURACIÓN INICIAL
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_KEY,
      test: true // Mantenlo en true para pruebas con tarjetas de test
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

      // Atributos de identidad
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_KEY,
      
      // Metadatos para el Webhook
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Iniciando Checkout con Key:", EPAYCO_KEY);
    handler.open(data);
  } else {
    alert("El motor de pagos se está cargando. Reintenta en un segundo.");
  }
};