     // src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const EPAYCO_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const MERCHANT_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (typeof window !== 'undefined' && window.ePayco) {
    
    const handler = window.ePayco.checkout.configure({
      key: EPAYCO_KEY,
      test: true 
    });

    // 1. MAPEADO DE IDS (Asegúrate que coincidan con tu panel de ePayco)
       const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual",
      escuadrilla_anual:   "plan_escuadrilla_mensual",
      flota_mensual:       "plan_escuadrilla_mensual",
      flota_anual:         "plan_escuadrilla_mensual"
    };

    // 2. CÁLCULO DE MONTO (Para evitar el error de 'undefined')
    // TRM fija sugerida: 4000
    const TRM = 4000;
    let amountUSD = planName.toLowerCase().includes('escuadrilla') ? 49 : 129;
    let finalAmountCOP = isAnnual ? (amountUSD * 12 * 0.8) * TRM : amountUSD * TRM;

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;

    const data = {
      // --- DATOS DE LA SUSCRIPCIÓN ---
      id_plan: PLAN_IDS[key] || "",
      name: `BitaFly - ${planName}`,
      description: `Suscripción ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      amount: finalAmountCOP.toString(), // <--- SOLUCIÓN: Enviamos el monto calculado
      
      // --- CONFIGURACIÓN TÉCNICA ---
      country: "co",
      lang: "es",
      external: "true", 
      p_cust_id_cliente: MERCHANT_ID,
      p_key: EPAYCO_KEY,
      
      // --- METADATOS PARA EL WEBHOOK ---
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Iniciando cobro para:", key, "Monto COP:", finalAmountCOP);
    handler.open(data);
  }
};