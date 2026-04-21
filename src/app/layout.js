import "./globals.css";
import Script from 'next/script';
import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  title: "BitaFly Manager - Aviation Log",
  description: "Gestión aeronáutica profesional UAS",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{
    __html: `
      (function() {
        var originalAddEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
            if (typeof options === 'boolean') options = { capture: options, passive: true };
            else if (typeof options === 'object') options.passive = options.passive !== undefined ? options.passive : true;
          }
          originalAddEventListener.call(this, type, listener, options);
        };
      })();
    `
  }} />
      </head>
      <body className="antialiased">
        {children}
        {/* LIBRERÍA OFICIAL DE CHECKOUT PRO - Más estable para suscripciones */}
        <Script 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  );
}