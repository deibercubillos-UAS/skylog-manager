export const openEpaycoCheckout = (planName, price) => {
  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true // Cambia a false cuando ya tengas llaves de producción
    });

    // Convertimos precios a Pesos Colombianos (COP) aproximados para la prueba
    const amount = price === '49' ? 199000 : price === '129' ? 490000 : 0;

    handler.open({
      name: `BitaFly - ${planName}`,
      description: `Suscripción mensual: ${planName}`,
      currency: "cop",
      amount: amount.toString(),
      tax_base: "0",
      tax: "0",
      country: "co",
      lang: "es",
      external: "false",
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,
    });
  } else {
    alert("La pasarela de pagos se está cargando. Intenta de nuevo en un segundo.");
  }
};