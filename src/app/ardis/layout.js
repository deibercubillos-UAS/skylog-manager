import { notFound } from 'next/navigation';
import { isArdisEnabled } from '@/lib/ardis/env';

// noindex a nivel de metadata: las páginas hijas heredan esto salvo que lo
// sobreescriban explícitamente.
export const metadata = {
  title: 'ARDIS',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  manifest: '/ardis/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/ardis/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/ardis/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/ardis/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ARDIS',
  },
};

export const viewport = {
  themeColor: '#111318',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function ArdisLayout({ children }) {
  // Kill switch: con ARDIS_ENABLED distinto de 'true', /ardis entero deja de
  // existir — incluida /ardis/entrar. No hay excepción aquí a propósito.
  if (!isArdisEnabled()) {
    notFound();
  }

  return children;
}
