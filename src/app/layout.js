import "./globals.css";
import { Public_Sans } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/+$/, '');

/*
 * MATERIAL SYMBOLS — ejes fijos, sin icon_names.
 *
 * El parámetro icon_names= de Google Fonts solo funciona desde browsers
 * con sesión de Google autenticada; retorna 400 desde otros contextos,
 * rompiendo la carga completa de la fuente.
 *
 * Compromiso adoptado:
 *  - Ejes fijos @24,400,0,0 (en lugar de rangos variables 20..48 / 100..700 / etc.)
 *    → fuente estática, más liviana que la variable completa (~370 KB)
 *    → todos los ~3,000 glifos disponibles, sin riesgo de íconos rotos
 *  - display=swap: muestra fallback de texto mientras carga (visible)
 *    en lugar de invisible 3 s (display=block).
 *
 * Resultado: la fuente carga correctamente en todos los navegadores
 * y contextos de red. Google la cachea en el CDN del usuario tras la
 * primera visita.
 */
const MATERIAL_SYMBOLS_URL =
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Bitafly | Software de Gestión para Operadores de Drones en Colombia',
    template: '%s | Bitafly',
  },
  description: 'Software para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento de drones y baterías, SMS aeronáutico, autorizaciones AeroCivil y reportes oficiales en una sola plataforma. Prueba gratis.',
  applicationName: 'Bitafly',
  keywords: [
    'software drones Colombia',
    'bitácora drones',
    'RAC 100',
    'AeroCivil drones',
    'gestión UAS',
    'mantenimiento drones',
    'SMS aeronáutico',
    'operador UAS Colombia',
    'permiso de vuelo drone',
    'plataforma operadores drones',
    'sistema gestión seguridad operacional',
    'software aeronáutico Colombia',
  ],
  authors: [{ name: 'Bitafly Operations', url: SITE_URL }],
  creator: 'Bitafly Operations',
  publisher: 'Bitafly Operations',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
    languages: {
      'es-CO': '/',
      'es': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: SITE_URL,
    siteName: 'Bitafly',
    title: 'Bitafly | Software de Gestión para Operadores de Drones en Colombia',
    description: 'Bitácora digital RAC 100, mantenimiento, SMS aeronáutico y autorizaciones AeroCivil para operadores UAS en Colombia.',
    images: [
      {
        // Reemplazar logo.png por screenshot real del dashboard para mejor CTR social.
        // Guardar la imagen en /public/og-dashboard.png (1200×630 px, PNG o WebP).
        // Mientras no exista og-dashboard.png, Next.js sirve el logo como fallback.
        url: '/og-dashboard.png',
        width: 1200,
        height: 630,
        alt: 'Bitafly — Dashboard de gestión aeronáutica para operadores UAS en Colombia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitafly | Software para Operadores de Drones en Colombia',
    description: 'Bitácora digital RAC 100, mantenimiento, SMS y autorizaciones AeroCivil para operadores UAS.',
    images: ['/logo.png'],
    creator: '@bitafly',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon', url: '/icons/icon-192.png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  category: 'Software Empresarial',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ec5b13' },
    { media: '(prefers-color-scheme: dark)', color: '#1A202C' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'light',
  // Required for env(safe-area-inset-*) to work on iOS notch/Dynamic Island devices
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO" className={`${publicSans.variable} scroll-smooth`}>
      <head>
        {/*
          dns-prefetch (no preconnect): la fuente se carga async con afterInteractive,
          así que la conexión a Google Fonts no necesita estar lista antes del primer
          paint. dns-prefetch prepara el DNS sin bloquear ni consumir sockets.
        */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        {process.env.NEXT_PUBLIC_GA_ID && <link rel="dns-prefetch" href="https://www.google-analytics.com" />}
        {process.env.NEXT_PUBLIC_GA_ID && <link rel="dns-prefetch" href="https://www.googletagmanager.com" />}
        {/*
          Material Symbols — carga NO bloqueante (afterInteractive).
          <link rel="stylesheet"> externo bloqueaba FCP/LCP en Slow 4G:
          2 round-trips a Google (CSS + font file) = ~400-600ms de retraso.
          Ahora el font se inyecta después del primer paint: FCP/LCP inmediatos,
          íconos aparecen ~50ms después (imperceptible). display=swap = fallback texto.
        */}

        {/*
          Schema.org — inline <script> (no afterInteractive) para que Googlebot
          vea el JSON-LD en el HTML inicial, no tras hidratación de React.

          Dos grafos entrelazados por @id:
            1. Organization — entidad principal de Bitafly
            2. WebSite     — sitio web con sitelinks search box
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              // @id: ancla canónica — Google usa este IRI para desambiguar
              // la entidad en todos los demás esquemas del sitio.
              "@id": `${SITE_URL}/#organization`,
              "name": "Bitafly",
              "legalName": "Bitafly Operations",
              "url": SITE_URL,
              // logo como ImageObject (no solo string) — activa Knowledge Panel
              "logo": {
                "@type": "ImageObject",
                "@id": `${SITE_URL}/#logo`,
                "url": `${SITE_URL}/logo.png`,
                "width": 320,
                "height": 277,
                "caption": "Bitafly — Software para operadores de drones en Colombia"
              },
              "image": { "@id": `${SITE_URL}/#logo` },
              "description": "Plataforma SaaS para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento de drones, SMS aeronáutico, autorizaciones AeroCivil y reportes oficiales.",
              "email": "soporte@bitafly.com",
              "foundingDate": "2024",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "CO",
                "addressRegion": "Cundinamarca",
                "addressLocality": "Bogotá"
              },
              "areaServed": [
                { "@type": "Country", "name": "Colombia" }
              ],
              "contactPoint": [
                {
                  "@type": "ContactPoint",
                  "contactType": "customer support",
                  "email": "soporte@bitafly.com",
                  "availableLanguage": ["Spanish"],
                  "areaServed": "CO"
                }
              ],
              "knowsAbout": [
                "Operaciones de drones en Colombia",
                "RAC 100 UAEAC AeroCivil",
                "Bitácora digital de vuelo UAS",
                "SMS aeronáutico RPAS",
                "Gestión de flotas de drones",
                "Autorizaciones de vuelo AeroCivil",
                "Análisis de riesgo SORA JARUS"
              ],
              "sameAs": [
                "https://www.linkedin.com/company/bitafly",
                "https://www.instagram.com/bitafly.co"
              ],
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Planes Bitafly para Operadores UAS",
                "url": `${SITE_URL}/precios`
              }
            })
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              "name": "Bitafly",
              "url": SITE_URL,
              "inLanguage": "es-CO",
              "description": "Software de gestión para operadores de drones en Colombia — RAC 100, bitácora, mantenimiento, SMS y autorizaciones AeroCivil.",
              "publisher": { "@id": `${SITE_URL}/#organization` },
              // Sitelinks search box — Google puede mostrar buscador inline en SERP
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${SITE_URL}/blog?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}

        {/* Material Symbols — async, no bloquea FCP ni LCP */}
        <Script id="load-material-symbols" strategy="afterInteractive">{`
          (function(){
            var l=document.createElement('link');
            l.rel='stylesheet';
            l.href='${MATERIAL_SYMBOLS_URL}';
            document.head.appendChild(l);
          })();
        `}</Script>

        {/* Service Worker — registrar después del primer paint para no bloquear */}
        <Script id="register-sw" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .catch(function(err) { console.warn('[SW] registro fallido:', err); });
            });
          }
        `}</Script>

        <SpeedInsights />
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
