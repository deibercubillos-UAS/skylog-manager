import "./globals.css";
import { Public_Sans } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL('https://bitafly.com'), // ← cambia por tu dominio real en Vercel
  title: {
    default: 'Bitafly | Gestión Aeronáutica Profesional para Operadores UAS',
    template: '%s | Bitafly',
  },
  description: 'Plataforma SaaS para operadores de drones en Colombia. Bitácoras digitales, mantenimiento, SMS, autorizaciones AeroCivil y cumplimiento RAC 100 en un solo lugar.',
  keywords: ['drones Colombia', 'RAC 100', 'bitácora UAS', 'mantenimiento drones', 'AeroCivil', 'operador UAS', 'SMS aeronáutico', 'gestión aeronáutica'],
  authors: [{ name: 'Bitafly Operations' }],
  creator: 'Bitafly Operations',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    url: 'https://bitafly.com',
    siteName: 'Bitafly',
    title: 'Bitafly | Gestión Aeronáutica Profesional',
    description: 'La plataforma inteligente para operadores UAS y tripulaciones en Colombia.',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Bitafly - Gestión Aeronáutica',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bitafly | Gestión Aeronáutica Profesional',
    description: 'Plataforma para operadores UAS en Colombia',
    images: ['/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${publicSans.variable}`}>
      <head>
        {/* Preconexión a Google Fonts para acelerar la descarga */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols con display=block para que NO muestre texto mientras carga la fuente */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
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
      "url": "https://bitafly.com",
      "logo": "https://bitafly.com/logo.png",
      "description": "Plataforma SaaS para operadores de drones en Colombia. Bitácoras digitales, mantenimiento, SMS y cumplimiento RAC 100.",
      "email": "soporte@bitafly.com",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "CO",
        "addressRegion": "Colombia"
      },
      "areaServed": {
        "@type": "Country",
        "name": "Colombia"
      },
      "sameAs": []
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