export default function manifest() {
  return {
    // Identity
    id: '/',
    name: 'Bitafly | Gestión Aeronáutica para Operadores UAS',
    short_name: 'Bitafly',
    description:
      'Plataforma SaaS para operadores de drones en Colombia. Bitácora RAC 100, mantenimiento, SMS aeronáutico y autorizaciones AeroCivil.',

    // Navigation
    start_url: '/dashboard',
    scope: '/',

    // Display — prefer standalone, fall back gracefully
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],

    // Appearance
    background_color: '#f8f6f6',
    theme_color: '#ec5b13',
    // 'any' — el dashboard se usa en escritorio, tablet y controles DJI (landscape)
    orientation: 'any',

    // Locale
    lang: 'es-CO',
    dir: 'ltr',

    // Store categorization
    categories: ['business', 'productivity', 'utilities'],
    prefer_related_applications: false,

    // Icons — todos los tamaños requeridos para instalación PWA en Android/DJI RC
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],

    // Quick-launch shortcuts (Android long-press / desktop right-click)
    shortcuts: [
      {
        name: 'Bitácora de Vuelo',
        short_name: 'Bitácora',
        description: 'Ver y registrar vuelos',
        url: '/dashboard/logbook',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Autorizar Misión',
        short_name: 'Misión',
        description: 'Crear autorización de vuelo',
        url: '/dashboard/plan-vuelo',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Mantenimiento',
        short_name: 'Mantenimiento',
        description: 'Registrar intervención técnica',
        url: '/dashboard/maintenance',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Importar DJI',
        short_name: 'DJI',
        description: 'Importar logs del control DJI',
        url: '/dashboard/logbook',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],

    // Screenshots — mejoran el diálogo de instalación en Chrome/Android.
    // 'wide' (og-dashboard) ya existe; la screenshot 'narrow' (móvil) se agrega en F1.4.
    screenshots: [
      {
        src: '/og-dashboard.png',
        sizes: '1200x630',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Panel principal de BitaFly',
      },
    ],
  };
}
