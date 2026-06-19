import './globals.css';
import { DEMO } from '@/demo.config';
import { DemoProvider } from '@/lib/demoStore';
import PasswordGate from '@/components/PasswordGate';

export const metadata = {
  title: `Demo Enterprise · ${DEMO.poweredBy}`,
  description: 'Demostración del plan Enterprise pago-por-vuelo (datos simulados).',
  robots: { index: false, follow: false }, // demo: no indexar
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // no bloquear el zoom (accesibilidad)
};

export default function RootLayout({ children }) {
  // Inyecta los colores white-label como variables CSS en <html>
  const brandVars = `:root{--brand-accent:${DEMO.accent};--brand-navy:${DEMO.navy};}`;

  return (
    <html lang="es">
      <head>
        <style dangerouslySetInnerHTML={{ __html: brandVars }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body>
        {/* Cinta global: deja claro que es una simulación */}
        <div className="w-full bg-amber-400 text-amber-950 text-center text-xs font-bold py-1.5 px-4">
          ⚠️ {DEMO.disclaimer}
        </div>
        <PasswordGate>
          <DemoProvider>{children}</DemoProvider>
        </PasswordGate>
      </body>
    </html>
  );
}
