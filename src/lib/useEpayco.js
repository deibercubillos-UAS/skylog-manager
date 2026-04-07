// FILE: src/lib/useEpayco.js
export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (!P_KEY || !CUST_ID) {
    console.error("CRITICAL SECURITY FAILURE: ePayco environment variables are not configured.");
    alert("⚠️ El sistema de pagos no está configurado. Contacta a soporte.");
    return;
  }

  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true // Mantenemos true para fase de pruebas. Cambiar a false para producción.
    });

    // --- LÓGICA DE PRECIOS DINÁMICOS RESTAURADA ---
    const planKey = planName.toLowerCase();
    let amountCOP = 0;
    
    if (planKey.includes('escuadrilla')) {
      amountCOP = isAnnual ? 1910000 : 199000;
    } else if (planKey.includes('flota')) {
      amountCOP = isAnnual ? 5040000 : 525000;
    } else {
        alert("Plan no válido para pago.");
        return;
    }

    const data = {
      amount: amountCOP.toString(),
      name: `BitaFly - Plan ${planName}`,
      description: `Activación de suscripción ${planName} (${isAnnual ? 'Anual' : 'Mensual'})`,
      currency: "cop",
      country: "co",
      lang: "es",
      external: "true",
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      // Metadatos dinámicos para el Webhook
      extra1: planKey,
      extra2: userId,
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,
    };

    console.log("🚀 Iniciando Checkout Dinámico:", data);
    handler.open(data);
  } else {
    alert("Cargando pasarela segura... Por favor, reintenta en un segundo.");
  }
};