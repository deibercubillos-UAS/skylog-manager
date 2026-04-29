export default function manifest() {
  return {
    name: 'Bitafly | Gestión Aeronáutica para Operadores UAS',
    short_name: 'Bitafly',
    description:
      'Plataforma SaaS para operadores de drones en Colombia. Bitácora RAC 100, mantenimiento, SMS aeronáutico y autorizaciones AeroCivil.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f6f6',
    theme_color: '#ec5b13',
    orientation: 'portrait-primary',
    lang: 'es-CO',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: '/logo.png',
        sizes: '320x277',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '320x277',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
