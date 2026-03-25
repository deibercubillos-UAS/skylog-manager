export const openEpaycoCheckout = (planName, userEmail, userId, isAnnual) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true // Cambiar a false en producción
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
      name: `BitaFly - Plan ${planName}`,
      description: `Suscripción ${isAnnual ? 'Anual' : 'Mensual'} BitaFly UAS`,
      currency: "cop",
      country: "co",
      lang: "es",
      external: "false",
      
      // Datos para que el Webhook reconozca al usuario
      extra1: planName.toLowerCase(), 
      extra2: userId, 
      
      email_billing: userEmail,
      confirmation: `https://bitafly.com/api/payments/confirmation`,
      response: `https://bitafly.com/dashboard/subscription/response`,
    };

    handler.open(data);
  } else {
    alert("Iniciando pasarela segura... Por favor, pulsa de nuevo en un segundo.");
  }
};