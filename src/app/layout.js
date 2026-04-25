import "./globals.css";
import { Public_Sans } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

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
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: '/logo.png',
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
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-CO" className={`${publicSans.variable} scroll-smooth`}>
      <head>
        {/* Preconexión para acelerar la descarga de fuentes externas */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />

        {/* Schema.org — Organization (rich result en buscadores) */}
        <Script
          id="schema-organization"
          type="application/ld+json"
          strategy="beforeInteractive"
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
          strategy="beforeInteractive"
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
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
      </body>
    </html>
  );
}
