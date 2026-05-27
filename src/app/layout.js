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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

/*
 * MATERIAL SYMBOLS — subsetado a los íconos usados + ejes fijos.
 *
 * Problema anterior: la URL cargaba la fuente VARIABLE completa (~370 KB)
 * con rangos opsz 20–48, wght 100–700, FILL 0–1, GRAD -50–200, sin subsetting
 * de glifos → el archivo woff2 contenía los ~3,000 íconos aunque usamos ~110.
 *
 * Solución:
 *  1. Ejes fijos @24,400,0,0 en lugar de rangos → fuente estática, mucho más liviana.
 *  2. icon_names= con solo los íconos usados → ~15-25 KB en lugar de ~370 KB.
 *  3. display=block → oculta el texto "check_circle" / "arrow_back" mientras
 *     carga (en vez de mostrarlo como texto con display=swap).
 *     Con el subset pequeño la fuente llega en <500 ms, así el período
 *     invisible es imperceptible.
 *
 * Para agregar un ícono nuevo: agrégalo a ICON_NAMES y haz deploy.
 */
const ICON_NAMES = [
  'account_circle','add','add_circle','add_location_alt','admin_panel_settings',
  'arrow_back','arrow_forward','assessment','assignment_ind','attach_file',
  'badge','battery_charging_full','browser_not_supported','build','business',
  'category','check','check_circle','checklist','chevron_right',
  'circle','close','cloud_done','cloud_upload','credit_card',
  'dashboard','delete','delete_sweep','description','download',
  'edit','edit_square','error','event_available','expand_less','expand_more',
  'explore','fact_check','flight','flight_land','flight_takeoff',
  'folder_shared','format_quote','gavel','group','group_add','groups',
  'health_and_safety','hourglass_empty','how_to_reg',
  'info','inventory_2','key','lightbulb','link','lock','lock_reset','logout',
  'mail','manage_accounts','manage_search','map','mark_email_read','menu_book',
  'note_add','open_in_full','payments','pentagon','person','person_add',
  'person_add_alt','person_check','picture_as_pdf','playlist_add_check',
  'policy','precision_manufacturing','progress_activity',
  'radar','remove_circle','report_problem','rocket_launch','route','rule',
  'save','schedule','search','send','settings','settings_accessibility',
  'settings_input_component','settings_suggest','shield_person','summarize',
  'sync','table_chart','table_view','task_alt','timer','travel_explore',
  'trending_down','trending_up','tune','upload_file','usb',
  'verified','verified_user','visibility','warning','wb_sunny',
].join(',');

const MATERIAL_SYMBOLS_URL =
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0` +
  `&icon_names=${ICON_NAMES}&display=block`;

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
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Bitafly — Plataforma de gestión aeronáutica para operadores UAS',
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
      { url: '/logo.png', type: 'image/png', sizes: '320x277' },
    ],
    shortcut: '/logo.png',
    apple: [
      { url: '/logo.png', sizes: '320x277', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon', url: '/logo.png' },
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
        {/* Preconexión para acelerar la descarga de fuentes externas */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols — subsetado (~110 íconos, ejes fijos) → ~20 KB en lugar de ~370 KB */}
        <link rel="preload" as="style" href={MATERIAL_SYMBOLS_URL} />
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_URL} />

        {/* Schema.org — Organization (rich result en buscadores) */}
        <Script
          id="schema-organization"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Bitafly",
              "legalName": "Bitafly UAS Manager",
              "url": SITE_URL,
              "logo": `${SITE_URL}/logo.png`,
              "description": "Plataforma SaaS para operadores de drones en Colombia. Bitácoras digitales, mantenimiento, SMS aeronáutico y cumplimiento RAC 100.",
              "email": "soporte@bitafly.com",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "CO",
                "addressRegion": "Cundinamarca",
                "addressLocality": "Bogotá"
              },
              "areaServed": {
                "@type": "Country",
                "name": "Colombia"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer support",
                "email": "soporte@bitafly.com",
                "availableLanguage": ["Spanish", "es-CO"]
              },
              "sameAs": []
            })
          }}
        />

        {/* Schema.org — WebSite con búsqueda interna (sitelinks) */}
        <Script
          id="schema-website"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Bitafly",
              "url": SITE_URL,
              "inLanguage": "es-CO",
              "publisher": {
                "@type": "Organization",
                "name": "Bitafly"
              }
            })
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <SpeedInsights />
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
