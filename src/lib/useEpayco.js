// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  // 1. LLAVE MAESTRA (Si la variable de Vercel falla, usamos esta fija para la prueba)
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY || "2e2aa67391a6c81cbefbaeab54c4dc22";
  const CUST_ID = "1577037";

  if (typeof window !== 'undefined' && window.ePayco) {
    
    // CONFIGURACIÓN DEL HANDLER
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true 
    });

    // 2. IDS TÉCNICOS REALES (Sacados de tus pruebas anteriores)
    const PLAN_IDS = {
      escuadrilla_mensual: "plan_escuadrilla_mensual", 
      escuadrilla_anual:   "9be0e74f1778c85f40392bd", 
      flota_mensual:       "9be0e7df6630f6a394f7096", 
      flota_anual:         "9be0e81b6727c738608e137" 
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    // 3. MONTO COHERENTE CON EL PLAN (Evita error de rangos)
    let amountValue = isAnnual ? "1910000" : "199000";
    if (planName.toLowerCase().includes('flota')) {
        amountValue = isAnnual ? "5040000" : "525000";
    }

    const data = {
      // Atributos de Suscripción
      id_plan: selectedPlanId,
      amount: amountValue,
      name: `BitaFly - ${planName}`,
      description: `Suscripción Recurrente BitaFly UAS`,
      currency: "cop",
      type_checkout: "subscription",
      
      // Identificación obligatoria
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      // Configuración de red
      country: "co",
      lang: "es",
      external: "true", 
      
      // Metadatos para el Webhook de BitaFly
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    console.log("🚀 Iniciando Checkout BitaFly con Plan:", selectedPlanId);
    handler.open(data);
  } else {
    alert("Sincronizando con ePayco... Reintenta en 1 segundo.");
  }
};