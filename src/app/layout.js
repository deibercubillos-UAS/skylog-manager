import "./globals.css";
import { Public_Sans, Lexend } from "next/font/google";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import AttributionTracker from '@/components/AttributionTracker';
import CookieConsentManager from '@/components/legal/CookieConsentManager';

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  // display:"optional" + preload:false = fuente completamente fuera de la ruta crítica.
  // Con preload:true (default), next/font añade <link rel="preload"> y mete el
  // woff2 (~40KB) como tercer eslabón en la cadena crítica: HTML→CSS→woff2.
  // Eso bloquea el primer paint del H1 hasta que la fuente llega (2310ms de
  // "render delay" medido en PageSpeed Insights). Con preload:false el navegador
  // pinta el H1 con la fuente del sistema inmediatamente; Public Sans carga en
  // background y en visitas con caché llega en los ~100ms que permite "optional".
  // next/font sigue ajustando las métricas del respaldo (adjustFontFallback)
  // para que CLS sea 0 incluso si la fuente nunca llega.
  display: "optional",
  preload: false,
});

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  display: "swap",
  weight: ['400', '700', '900'],
  // Lexend solo se usa debajo del pliegue (Pricing, Features, registro).
  // No precargarla libera ancho de banda crítico para Public Sans (la fuente
  // del H1 del hero = elemento LCP en móvil), mejorando FCP/LCP en 4G lento.
  preload: false,
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/+$/, '');

/*
 * MATERIAL SYMBOLS — auto-alojado en /public/fonts/material-symbols-outlined.woff2
 * (eje estático @24,400,0,0, ~312KB, todos los glifos). Se precarga en <head> y
 * el @font-face vive en globals.css. Antes se inyectaba la hoja de Google con
 * afterInteractive, lo que retrasaba los íconos hasta después de la hidratación.
 * Mismo origen + preload = carga inmediata, sin round-trips a Google, cacheable
 * por el Service Worker para operación offline. Ver globals.css.
 */
const MATERIAL_SYMBOLS_FONT = '/fonts/material-symbols-outlined.woff2';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Bitafly — Software para Drones en Colombia',
    template: '%s | Bitafly',
  },
  description: 'Software para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento de drones y baterías, SMS aeronáutico, autorizaciones AeroCivil y reportes RAC 100 con tu propio código de formato, en una sola plataforma. Prueba gratis.',
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
  authors: [{ name: 'BitaFly S.A.S.', url: SITE_URL }],
  creator: 'BitaFly S.A.S.',
  publisher: 'BitaFly S.A.S.',
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
    title: 'Bitafly — Software para Drones en Colombia',
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
      { url: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon', sizes: '180x180', url: '/icons/apple-touch-icon-180.png' },
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
    <html lang="es-CO" className={`${publicSans.variable} ${lexend.variable} scroll-smooth`}>
      <head>
        {/*
          Material Symbols auto-alojado: precarga del woff2 (mismo origen).
          fetchPriority="low": el font pesa ~312KB y los íconos están casi todos
          bajo el pliegue; en prioridad alta competía por el ancho de banda en 4G
          con la fuente del H1 (el elemento LCP), retrasando el LCP a ~4s en mobile.
          Con prioridad baja arranca temprano pero cede el ancho de banda a los
          recursos críticos (fuente del hero, CSS, JS). crossOrigin es obligatorio
          aun en mismo origen porque las fuentes se piden en modo CORS.
        */}
        <link rel="preload" href={MATERIAL_SYMBOLS_FONT} as="font" type="font/woff2" crossOrigin="anonymous" fetchPriority="low" />
        {/*
          preconnect (no solo dns-prefetch) para Vercel Analytics/Speed Insights:
          a diferencia de GA/GTM/Clarity, estos 2 orígenes se cargan SIEMPRE en
          cada página (Analytics/SpeedInsights más abajo, sin gate de cookies) —
          preconnect adelanta también el handshake TCP/TLS, no solo el DNS.
          Señalado por PageSpeed Insights (2 sugerencias de preconnect, 2026-08-01).
        */}
        <link rel="preconnect" href="https://va.vercel-scripts.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://vitals.vercel-insights.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        {process.env.NEXT_PUBLIC_GA_ID && <link rel="dns-prefetch" href="https://www.google-analytics.com" />}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        {process.env.NEXT_PUBLIC_CLARITY_ID && <link rel="dns-prefetch" href="https://www.clarity.ms" />}

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
              // Variantes/errores tipográficos comunes (autocorrección de teclado,
              // separación de sílabas) — le indica a Google que son la misma entidad.
              "alternateName": ["BitaFly", "Vita Fly", "VitaFly", "Bita Fly", "Vitafly"],
              "legalName": "BitaFly S.A.S.",
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
              "description": "Plataforma SaaS para operadores UAS en Colombia. Bitácora digital RAC 100, mantenimiento de drones, SMS aeronáutico, autorizaciones AeroCivil y reportes RAC 100 con tu propio código de formato.",
              "email": "soporte@bitafly.com",
              "foundingDate": "2024",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "CO",
                "addressRegion": "Cundinamarca",
                "addressLocality": "Madrid"
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
        {/*
          GTM/GA/Clarity ya NO se cargan aquí incondicionalmente — ver
          CookieConsentManager.js. Ese componente muestra el aviso de cookies
          y solo inyecta estos tres scripts (incluida la variante <noscript>
          de GTM) después de que el usuario pulsa "Aceptar", conforme a la
          Resolución 32.126/2022 de la SIC (consentimiento previo, expreso e
          informado para cookies analíticas/de terceros). Antes de este
          cambio, GTM se cargaba siempre — ver "Páginas legales" en
          CLAUDE.md para el detalle de esta corrección.
        */}
        <CookieConsentManager />

        {/* Captura de atribución de marketing (UTM + referrer) — localStorage
            de primera parte, no cookies de terceros; sin UI */}
        <AttributionTracker />

        {children}

        {/* Material Symbols: auto-alojado y precargado en <head> (ver arriba) */}

        {/*
          Service Worker — SOLO en producción.

          En desarrollo el SW rompe el dev server: cachea /_next/static/* con
          cache-first y / con stale-while-revalidate, pero `next dev` regenera los
          chunks de webpack en cada compilación. El SW sirve el runtime/chunks
          viejos → desincronización → "Cannot read properties of undefined
          (reading 'call')" en webpack.js + mismatch de hidratación #document.
          Como el caché vive en el navegador, sobrevive a `rm -rf .next` y a
          reiniciar el servidor. En prod los chunks tienen hash inmutable, así que
          cache-first es correcto.

          En dev además desregistramos cualquier SW previo y limpiamos sus cachés
          para auto-reparar navegadores que ya quedaron con el SW instalado.
        */}
        {process.env.NODE_ENV === 'production' ? (
          <Script id="register-sw" strategy="afterInteractive">{`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' })
                  .catch(function(err) { console.warn('[SW] registro fallido:', err); });
              });
            }
          `}</Script>
        ) : (
          <Script id="unregister-sw" strategy="afterInteractive">{`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(regs){
                regs.forEach(function(r){ r.unregister(); });
              });
            }
            if (window.caches && caches.keys) {
              caches.keys().then(function(keys){
                keys.forEach(function(k){ caches.delete(k); });
              });
            }
          `}</Script>
        )}

        {/* Microsoft Clarity y Google Analytics: ver CookieConsentManager —
            se cargan junto con GTM, solo tras aceptar el aviso de cookies. */}

        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
