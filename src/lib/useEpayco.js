// FILE: src/lib/useEpayco.js
export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  const P_KEY = process.env.NEXT_PUBLIC_EPAYCO_P_KEY;
  const CUST_ID = process.env.NEXT_PUBLIC_EPAYCO_CUST_ID;

  if (!P_KEY || !CUST_ID) {
    console.error("Seguridad: Credenciales de ePayco no configuradas en entorno.");
    alert("⚠️ El sistema de pagos no está configurado. Contacta a soporte.");
    return;
  }

  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: P_KEY,
      test: true // Mantenemos true para fase de pruebas
    });

    // FORZADO DE PLAN PARA PRUEBAS (Requerimiento)
    const PLAN_PRUEBA = "plan_escuadrilla_mensual";
    const amountCOP = 199000; // Monto fijo asignado a la prueba

    const data = {
      amount: amountCOP.toString(),
      name: `BitaFly - Suscripción (${PLAN_PRUEBA})`,
      description: `Activación de suscripción de prueba`,
      currency: "cop",
      country: "co",
      lang: "es",
      external: "true", 
      
      p_cust_id_cliente: CUST_ID,
      p_key: P_KEY,
      
      // METADATOS VITALES PARA EL WEBHOOK
      extra1: PLAN_PRUEBA, // <-- El webhook lee esto y lo inyecta a Supabase
      extra2: userId,
      extra3: "mensual",
      
      email_billing: userEmail,
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,
    };

    console.log("🚀 Iniciando Checkout de Prueba:", { plan: PLAN_PRUEBA, monto: amountCOP });
    handler.open(data);
  } else {
    alert("Cargando pasarela segura... Reintenta en un segundo.");
  }
};