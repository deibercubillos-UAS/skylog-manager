// src/lib/useEpayco.js

// 1. DICCIONARIO DE IDS (REEMPLAZA CON LOS DE TU PANEL DE EPAYCO)
export const BITAFLY_PLANS = {
  escuadrilla_mensual: "pruebas_epayco",
  escuadrilla_anual:   "plan_escuadrilla_anual",
  flota_mensual:       "plan_escuadrilla_mensual",
  flota_anual:         "plan_escuadrilla_mensual"
};

// 2. FUNCIÓN DE INICIALIZACIÓN
export const initEpayco = () => {
  if (typeof window !== 'undefined' && window.ePayco) {
    // Usamos la variable de entorno NEXT_PUBLIC para que sea accesible
    window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
    console.log("ePayco P_KEY configurada");
    return true;
  }
  return false;
};

// 3. MOTOR DE APERTURA (TOKENIZACIÓN)
export const openEpaycoCheckout = (planName, userEmail, userId, isAnnual) => {
  if (typeof window === 'undefined' || !window.ePayco) {
    alert("Cargando pasarela de pagos... Reintenta en un segundo.");
    return;
  }

  const handler = window.ePayco.checkout.configure({
    key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
    test: true 
  });

  const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
  const selectedPlanId = BITAFLY_PLANS[key];

  handler.open({
    id_plan: selectedPlanId || "",
    name: `BitaFly - ${planName}`,
    description: `Suscripción ${isAnnual ? 'Anual' : 'Mensual'}`,
    currency: "cop",
    country: "co",
    lang: "es",
    external: "false",
    extra1: planName.toLowerCase(), 
    extra2: userId, 
    email_billing: userEmail,
    confirmation: `${window.location.origin}/api/payments/confirmation`,
    response: `${window.location.origin}/dashboard/subscription/response`,
  });
};