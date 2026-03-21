// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  // Verificación de seguridad: Solo ejecutar en el navegador y si ePayco existe
  if (typeof window === 'undefined' || !window.ePayco) {
    console.error("ePayco SDK no está listo.");
    alert("La pasarela de pagos se está cargando. Por favor, intenta de nuevo en un segundo.");
    return;
  }

  try {
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true // Cambiar a false en producción
    });

    // REEMPLAZA ESTOS IDS CON TUS IDS REALES DE EPAYCO
    const PLAN_IDS = {
      escuadrilla_mensual: "78431",
      escuadrilla_anual:   "78430",
      flota_mensual:       "78429",
      flota_anual:         "78432"
    };

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const selectedPlanId = PLAN_IDS[key];

    const data = {
      id_plan: selectedPlanId || "", // Si no hay ID, ePayco mostrará error en el modal pero no romperá BitaFly
      name: `Suscripción BitaFly - ${planName}`,
      description: `Plan Recurrente ${planName} (${isAnnual ? 'Anual' : 'Mensual'})`,
      currency: "cop",
      country: "co",
      lang: "es",
      external: "false",
      extra1: planName.toLowerCase(), 
      extra2: userId || "", // Aseguramos que no sea null
      email_billing: userEmail || "",
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,
    };

    handler.open(data);
  } catch (error) {
    console.error("Error al abrir ePayco:", error);
    alert("Hubo un problema al iniciar la pasarela de pagos.");
  }
};