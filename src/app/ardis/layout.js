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
};

export default function ArdisLayout({ children }) {
  // Kill switch: con ARDIS_ENABLED distinto de 'true', /ardis entero deja de
  // existir — incluida /ardis/entrar. No hay excepción aquí a propósito.
  if (!isArdisEnabled()) {
    notFound();
  }

  return children;
}
