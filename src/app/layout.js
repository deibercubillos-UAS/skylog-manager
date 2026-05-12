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
 * MATERIAL SYMBOLS — lista exhaustiva de iconos que la app usa.
 * Si añades un icono nuevo en cualquier .js/.jsx, agrégalo aquí también
 * o aparecerá como texto plano en pantalla.
 * El subset icon_names (~60 KB) es más rápido que la fuente completa (~400 KB).
 */
const MATERIAL_ICONS = [
  'account_circle','account_tree','add','add_circle','admin_panel_settings',
  'analytics','arrow_back','arrow_forward','assessment','assignment_ind','attach_file','badge',
  'battery_charging_full','build','business','category','check','check_circle','checklist',
  'chevron_right','close','cloud_done','cloud_upload','credit_card','dashboard',
  'delete','delete_sweep','description','download','dynamic_form','edit',
  'edit_square','engineering','error','event_available','expand_less',
  'expand_more','explore','fact_check','flight','flight_land','flight_takeoff',
  'folder_shared','format_quote','gavel','group','group_add',
  'groups','health_and_safety','how_to_reg','info','inventory_2','label_important',
  'key','lightbulb','link','lock','lock_reset','logout','mail','manage_accounts','manage_search','map',
  'mark_email_read','menu','menu_book','menu_open','monitor_heart',
  'more_vert','note_add','notification_important','open_in_full','payments','person','person_add',
  'person_add_alt','person_check','photo_camera','picture_as_pdf','pin','policy',
  'precision_manufacturing','progress_activity','radar','remove_circle',
  'report','report_problem','rocket_launch',
  'rule','save','search','send','settings','settings_accessibility',
  'settings_input_component','settings_suggest','shield_person','summarize','sync',
  'table_view','task_alt','timer','travel_explore',
  'trending_down','trending_up','tune','upload_file',
  'verified','verified_user','visibility','visibility_off','warning','wb_sunny',
].join(',');

const MATERIAL_SYMBOLS_URL = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=block&icon_names=${MATERIAL_ICONS}`;

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
        {/*
          MATERIAL SYMBOLS OPTIMIZADO:
          - icon_names: subsetea SOLO los iconos usados (definidos en MATERIAL_ICONS arriba)
          - display=swap: NO bloquea el render mientras descarga
          - Sin rangos de wght/FILL/GRAD: usa la versión estática, no la variable
          - rel="preload" en el CSS para que arranque la descarga sin esperar al parser
        */}
        {/* Material Symbols — subsetado con icon_names, preload para arranque inmediato */}
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
