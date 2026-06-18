// ── Configuración white-label del demo ────────────────────────────────────────
// Cambia estos valores para re-brandear el demo según el cliente.
// El acento/navy se aplican vía variables CSS (ver globals.css / layout.js).

export const DEMO = {
  // Marca que se muestra en el demo (la organización cliente)
  clientName: 'Organización Demo',
  poweredBy: 'BitaFly',

  // Colores white-label (HEX). Se inyectan como variables CSS en <html>.
  accent: '#ec5b13',   // naranja BitaFly por defecto
  navy:   '#0F1419',

  // Parámetros del modelo (coinciden con la propuesta)
  pricePerFlight: 1000,        // COP por vuelo
  minMonthlyCredits: 500,      // mínimo mensual
  lowBalanceAlerts: [100, 50, 25, 10, 5],

  // Aviso permanente: esto es una simulación
  disclaimer: 'Demostración con datos simulados — sin pagos reales, sin base de datos.',
};
