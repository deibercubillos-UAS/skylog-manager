export const openEpaycoCheckout = (planName, price, userEmail = "") => {
  if (typeof window !== 'undefined' && window.ePayco) {
    const handler = window.ePayco.checkout.configure({
      key: process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY,
      test: true 
    });

    // Definición de precios en COP
    const prices = {
      '49': 199000,
      '129': 490000
    };

    const amount = prices[price] || 0;

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
      extra1: planName, // Usamos esto para saber qué plan activar luego
      email_billing: userEmail, // Pasa el email del usuario logueado
      confirmation: `${window.location.origin}/api/payments/confirmation`,
      response: `${window.location.origin}/dashboard/subscription/response`,
    });
  }
};