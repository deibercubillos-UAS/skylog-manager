export default function manifest() {
  return {
    // Identity
    id: '/',
    name: 'Bitafly | Gestión Aeronáutica para Operadores UAS',
    short_name: 'Bitafly',
    description:
      'Plataforma SaaS para operadores de drones en Colombia. Bitácora RAC 100, mantenimiento, SMS aeronáutico y autorizaciones AeroCivil.',

    // Navigation
    start_url: '/',
    scope: '/',

    // Display — prefer standalone, fall back gracefully
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],

    // Appearance
    background_color: '#f8f6f6',
    theme_color: '#ec5b13',
    orientation: 'portrait-primary',

    // Locale
    lang: 'es-CO',
    dir: 'ltr',

    // Store categorization
    categories: ['business', 'productivity', 'utilities'],
    prefer_related_applications: false,

    // Icons
    // NOTE: For full PWA install quality, add these files to /public:
    //   /icon-192.png  (192×192, solid orange background with white logo)
    //   /icon-512.png  (512×512, same design)
    //   /icon-maskable-512.png  (512×512 with ~20% safe-zone padding for adaptive icons)
    // Until then we use the available logo.png as a best-effort fallback.
    icons: [
      {
        src: '/logo.png',
        sizes: '320x277',
        type: 'image/png',
        purpose: 'any',
      },
    ],

    // Quick-launch shortcuts (Android long-press / desktop right-click)
    shortcuts: [
      {
        name: 'Bitácora de Vuelo',
        short_name: 'Bitácora',
        description: 'Ver y registrar vuelos',
        url: '/dashboard/logbook',
        icons: [{ src: '/logo.png', sizes: '320x277', type: 'image/png' }],
      },
      {
        name: 'Autorizar Misión',
        short_name: 'Misión',
        description: 'Crear autorización de vuelo',
        url: '/dashboard/authorizations',
        icons: [{ src: '/logo.png', sizes: '320x277', type: 'image/png' }],
      },
      {
        name: 'Mantenimiento',
        short_name: 'Mantenimiento',
        description: 'Registrar intervención técnica',
        url: '/dashboard/maintenance',
        icons: [{ src: '/logo.png', sizes: '320x277', type: 'image/png' }],
      },
    ],
  };
}
