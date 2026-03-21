// src/lib/useEpayco.js

export const openEpaycoCheckout = (planName, priceUSD, userEmail, userId, isAnnual) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true // Cambiar a 'false' para producción
    });

    // --- CÁLCULO DE PRECIOS EN COP ---
    // Definimos una TRM fija de 4.000 para consistencia (puedes ajustarla)
    const TRM = 4000;
    let amountUSD = parseFloat(priceUSD);
    
    // Si es anual, aplicamos el 20% de descuento al total de 12 meses
    // Formula: (Precio Mensual * 12) * 0.8
    let finalAmountCOP = 0;
    if (isAnnual) {
      finalAmountCOP = (amountUSD * 12 * 0.8) * TRM;
    } else {
      finalAmountCOP = amountUSD * TRM;
    }

    const planSlug = planName.toLowerCase();
    const description = `BitaFly UAS - Plan ${planName} (${isAnnual ? 'Anual' : 'Mensual'})`;

    const data = {
      name: "BitaFly Manager",
      description: description,
      currency: "cop",
      amount: finalAmountCOP.toString(),
      tax_base: "0",
      tax: "0",
      country: "co",
      lang: "es",
      external: "false",

      // ATRIBUTOS PARA EL WEBHOOK (Paso de datos al servidor)
      extra1: planSlug,            // Plan: escuadrilla / flota
      extra2: userId,              // ID único del usuario en Supabase
      extra3: isAnnual ? 'anual' : 'mensual',
      
      email_billing: userEmail,
      
      // URLs de retorno configuradas para bitafly.com
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,
    };

    handler.open(data);
  } else {
    alert("Iniciando pasarela de pagos... Por favor, pulsa de nuevo en 2 segundos.");
  }
};